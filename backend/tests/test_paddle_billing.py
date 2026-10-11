import hashlib
import hmac
import json
import time
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

from sqlalchemy import select

import test_deep_scan_endpoint as base
from app.api.v1.endpoints.billing import router as billing_router
from app.core.config import settings
from app.models.credit_entry import CreditEntry
from app.models.paddle import PaddleEvent, PaddleSubscription
from app.models import (  # noqa: F401
    asset, credit_entry, deleted_signup, email_verification, feedback,
    match, match_record, monitoring, password_reset, provider_usage,
    scan_job, session_cutoff, signup_key, takedown, user_event,
    user_suspension,
)
from app.services import credits, paddle_billing, plan_credits

SECRET = "pdl_ntfset_test_secret"
PRO_MONTH = "pri_pro_month"
PRO_YEAR = "pri_pro_year"
EXTRA_MONTH = "pri_extra_month"


def sign(body: bytes, *, ts: int | None = None, secret: str = SECRET) -> str:
    stamp = str(int(time.time()) if ts is None else ts)
    digest = hmac.new(
        secret.encode(), stamp.encode() + b":" + body, hashlib.sha256
    ).hexdigest()

    return f"ts={stamp};h1={digest}"


def event(
    kind: str,
    *,
    user_id: int,
    event_id: str = "evt_1",
    sub: str = "sub_1",
    status: str = "active",
    price: str = PRO_MONTH,
    occurred: str = "2026-10-01T10:00:00Z",
    started: str = "2026-10-01T10:00:00Z",
    scheduled: dict | None = None,
) -> dict:
    return {
        "event_id": event_id,
        "event_type": kind,
        "occurred_at": occurred,
        "data": {
            "id": sub,
            "status": status,
            "customer_id": "ctm_1",
            "custom_data": {"user_id": str(user_id)},
            "started_at": started,
            "items": [{"price": {"id": price}}],
            "current_billing_period": {
                "starts_at": started,
                "ends_at": "2026-11-01T10:00:00Z",
            },
            "scheduled_change": scheduled,
        },
    }


class PaddleCase(base.EndpointTestCase):
    def setUp(self) -> None:
        super().setUp()
        patch = mock.patch.multiple(
            settings,
            paddle_webhook_secret=SECRET,
            paddle_client_token="test_token",
            paddle_environment="sandbox",
            paddle_api_key="key",
            paddle_prices={
                PRO_MONTH: ("Pro", "month"),
                PRO_YEAR: ("Pro", "year"),
                EXTRA_MONTH: ("Extra", "month"),
            },
        )
        patch.start()
        self.addCleanup(patch.stop)

        self.user = self._user("buyer@example.com", "Free")

    def apply(self, payload: dict) -> str:
        return paddle_billing.handle_event(self.db, payload)

    def balance(self) -> int:
        return credits.get_balance(self.db, self.user.id)

    def refresh(self):
        self.db.expire_all()
        return self.db.get(type(self.user), self.user.id)


class SignatureTests(unittest.TestCase):
    def test_valid_signature(self) -> None:
        body = b'{"a":1}'
        self.assertTrue(
            paddle_billing.verify_signature(body, sign(body), SECRET)
        )

    def test_wrong_secret_body_or_missing_header(self) -> None:
        body = b'{"a":1}'
        self.assertFalse(
            paddle_billing.verify_signature(body, sign(body, secret="x"), SECRET)
        )
        self.assertFalse(
            paddle_billing.verify_signature(b'{"a":2}', sign(body), SECRET)
        )
        self.assertFalse(paddle_billing.verify_signature(body, None, SECRET))
        self.assertFalse(paddle_billing.verify_signature(body, "junk", SECRET))
        self.assertFalse(paddle_billing.verify_signature(body, sign(body), ""))

    def test_old_timestamp_is_refused(self) -> None:
        body = b"{}"
        old = int(time.time()) - 3600
        self.assertFalse(
            paddle_billing.verify_signature(body, sign(body, ts=old), SECRET)
        )

    def test_any_of_several_signatures_may_match(self) -> None:
        body = b"{}"
        header = sign(body) + ";h1=" + "0" * 64
        self.assertTrue(paddle_billing.verify_signature(body, header, SECRET))


class SubscriptionTests(PaddleCase):
    def test_creating_a_subscription_sets_the_plan_and_credits(self) -> None:
        self.apply(event("subscription.created", user_id=self.user.id))

        self.assertEqual(self.refresh().plan_type, "Pro")
        self.assertEqual(self.balance(), 10)

        row = self.db.get(PaddleSubscription, "sub_1")
        self.assertEqual((row.plan, row.interval), ("Pro", "month"))

    def test_the_same_event_twice_changes_nothing(self) -> None:
        payload = event("subscription.created", user_id=self.user.id)

        self.apply(payload)

        self.assertEqual(self.apply(payload), "duplicate")
        self.assertEqual(self.balance(), 10)
        self.assertEqual(len(list(self.db.scalars(select(PaddleEvent)))), 1)

    def test_an_older_event_arriving_late_is_ignored(self) -> None:
        self.apply(
            event(
                "subscription.updated",
                user_id=self.user.id,
                event_id="evt_new",
                status="canceled",
                occurred="2026-10-03T10:00:00Z",
            )
        )
        result = self.apply(
            event(
                "subscription.updated",
                user_id=self.user.id,
                event_id="evt_old",
                status="active",
                occurred="2026-10-02T10:00:00Z",
            )
        )

        self.assertTrue(result.startswith("ignored"))
        self.assertEqual(self.refresh().plan_type, "Free")

    def test_canceled_goes_back_to_free(self) -> None:
        self.apply(event("subscription.created", user_id=self.user.id))
        self.apply(
            event(
                "subscription.canceled",
                user_id=self.user.id,
                event_id="evt_2",
                status="canceled",
                occurred="2026-10-05T10:00:00Z",
            )
        )

        self.assertEqual(self.refresh().plan_type, "Free")

    def test_past_due_keeps_the_plan_and_paused_does_not(self) -> None:
        self.apply(event("subscription.created", user_id=self.user.id))
        self.apply(
            event(
                "subscription.past_due",
                user_id=self.user.id,
                event_id="evt_2",
                status="past_due",
                occurred="2026-10-02T10:00:00Z",
            )
        )
        self.assertEqual(self.refresh().plan_type, "Pro")

        self.apply(
            event(
                "subscription.paused",
                user_id=self.user.id,
                event_id="evt_3",
                status="paused",
                occurred="2026-10-03T10:00:00Z",
            )
        )
        self.assertEqual(self.refresh().plan_type, "Free")

    def test_a_scheduled_cancellation_keeps_the_plan_until_then(self) -> None:
        future = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        self.apply(
            event(
                "subscription.updated",
                user_id=self.user.id,
                scheduled={"action": "cancel", "effective_at": future},
            )
        )
        self.assertEqual(self.refresh().plan_type, "Pro")

        row = self.db.get(PaddleSubscription, "sub_1")
        self.assertEqual(row.scheduled_action, "cancel")

        # Once the date has passed, the plan ends even without the event.
        later = datetime.now(timezone.utc) + timedelta(days=11)
        paddle_billing.recompute_plan(self.db, self.refresh(), now=later)
        self.assertEqual(self.user.plan_type, "Free")

    def test_switching_to_extra_changes_the_plan(self) -> None:
        self.apply(event("subscription.created", user_id=self.user.id))
        self.apply(
            event(
                "subscription.updated",
                user_id=self.user.id,
                event_id="evt_2",
                price=EXTRA_MONTH,
                occurred="2026-10-02T10:00:00Z",
            )
        )

        self.assertEqual(self.refresh().plan_type, "Extra")

    def test_the_plan_can_come_from_the_price_custom_data(self) -> None:
        payload = event("subscription.created", user_id=self.user.id)
        payload["data"]["items"] = [
            {
                "price": {
                    "id": "pri_unlisted",
                    "custom_data": {"plan": "Extra", "interval": "year"},
                }
            }
        ]
        self.apply(payload)

        row = self.db.get(PaddleSubscription, "sub_1")
        self.assertEqual((row.plan, row.interval), ("Extra", "year"))

    def test_unknown_user_or_event_type_is_ignored_safely(self) -> None:
        self.assertTrue(
            self.apply(event("subscription.created", user_id=99999)).startswith(
                "ignored"
            )
        )
        self.assertTrue(
            self.apply(
                {"event_id": "evt_x", "event_type": "transaction.paid", "data": {}}
            ).startswith("ignored")
        )

    def test_internal_accounts_are_never_changed(self) -> None:
        self.apply(event("subscription.created", user_id=self.owner.id))

        self.assertEqual(self.refresh().plan_type, "Free")
        self.db.expire_all()
        self.assertEqual(self.db.get(type(self.owner), self.owner.id).plan_type, "Internal")


class MonthlyCreditTests(PaddleCase):
    def start(self, price: str = PRO_MONTH, started: str = "2026-01-15T10:00:00Z"):
        payload = event(
            "subscription.created", user_id=self.user.id, price=price, started=started
        )
        self.apply(payload)

    def test_month_arithmetic(self) -> None:
        start = datetime(2026, 1, 31, tzinfo=timezone.utc)
        self.assertEqual(plan_credits.add_months(start, 1).day, 28)
        self.assertEqual(
            plan_credits.months_elapsed(start, datetime(2026, 2, 27, tzinfo=timezone.utc)), 0
        )
        self.assertEqual(
            plan_credits.months_elapsed(start, datetime(2026, 2, 28, tzinfo=timezone.utc)), 1
        )
        self.assertEqual(
            plan_credits.months_elapsed(start, datetime(2027, 1, 31, tzinfo=timezone.utc)), 12
        )

    def test_a_new_month_adds_credits_and_expires_the_unused_ones(self) -> None:
        self.start(started="2026-01-15T10:00:00Z")
        # The real clock is months past the start: one grant for "now".
        first = self.balance()
        self.assertEqual(first, 10)

        # Spend 4 of them, then move to a later month.
        for _ in range(4):
            credits.charge_for_deep_scan(self.db, user_id=self.user.id, asset_id=1)
        # 10 plan + 3 welcome - 4 spent
        self.assertEqual(self.balance(), 9)

        later = datetime.now(timezone.utc) + timedelta(days=40)
        plan_credits.grant_due_plan_credits(self.db, self.user.id, now=later)
        self.db.commit()

        # The 6 unused plan credits expire, the 3 welcome ones stay, and
        # 10 new arrive: 3 + 10, not 9 + 10.
        self.assertEqual(self.balance(), 13)

        reasons = [
            row.reason
            for row in self.db.scalars(select(CreditEntry).order_by(CreditEntry.id))
        ]
        self.assertIn("expiry", reasons)

    def test_the_same_month_is_granted_once(self) -> None:
        self.start()
        plan_credits.grant_due_plan_credits(self.db, self.user.id)
        plan_credits.grant_due_plan_credits(self.db, self.user.id)
        self.db.commit()
        credits.get_credit_summary(self.db, self.user.id)

        plan_rows = [
            row
            for row in self.db.scalars(select(CreditEntry))
            if row.reason == "plan"
        ]
        self.assertEqual(len(plan_rows), 1)

    def test_other_credits_survive_the_monthly_expiry(self) -> None:
        credits.grant_credits(self.db, user_id=self.user.id, amount=5, note="bought")
        self.start()
        later = datetime.now(timezone.utc) + timedelta(days=40)
        plan_credits.grant_due_plan_credits(self.db, self.user.id, now=later)
        self.db.commit()

        # 5 by hand + 10 of this month; last month's 10 expired.
        self.assertEqual(self.balance(), 15)

    def test_a_yearly_plan_still_gets_credits_monthly(self) -> None:
        self.start(price=PRO_YEAR)
        self.assertEqual(self.balance(), 10)

    def test_extra_gets_forty(self) -> None:
        self.start(price=EXTRA_MONTH)
        self.assertEqual(self.balance(), 40)

    def test_no_credits_after_the_subscription_ends(self) -> None:
        self.start()
        self.apply(
            event(
                "subscription.canceled",
                user_id=self.user.id,
                event_id="evt_2",
                status="canceled",
                occurred="2026-10-05T10:00:00Z",
            )
        )
        before = self.balance()
        later = datetime.now(timezone.utc) + timedelta(days=60)
        plan_credits.grant_due_plan_credits(self.db, self.user.id, now=later)
        self.db.commit()

        self.assertEqual(self.balance(), before)

    def test_opening_the_credit_summary_grants_a_due_month(self) -> None:
        row = PaddleSubscription(
            subscription_id="sub_9",
            user_id=self.user.id,
            customer_id="ctm_1",
            status="active",
            plan="Pro",
            interval="year",
            started_at=datetime.now(timezone.utc) - timedelta(days=100),
        )
        self.db.add(row)
        self.db.commit()

        # welcome 3 + this month's plan 10
        self.assertEqual(credits.get_credit_summary(self.db, self.user.id), 13)


class EndpointTests(PaddleCase):
    def client(self):
        return self._client(billing_router)

    def post_event(self, client, payload, *, signature=True):
        body = json.dumps(payload).encode()
        headers = {"Paddle-Signature": sign(body)} if signature else {}

        return client.post(
            "/api/v1/billing/webhook", content=body, headers=headers
        )

    def test_webhook_needs_a_valid_signature(self) -> None:
        client = self.client()
        payload = event("subscription.created", user_id=self.user.id)

        self.assertEqual(self.post_event(client, payload, signature=False).status_code, 400)
        self.assertEqual(self.refresh().plan_type, "Free")

        self.assertEqual(self.post_event(client, payload).status_code, 200)
        self.assertEqual(self.refresh().plan_type, "Pro")

    def test_webhook_is_off_without_a_secret(self) -> None:
        with mock.patch.object(settings, "paddle_webhook_secret", ""):
            response = self.post_event(
                self.client(), event("subscription.created", user_id=self.user.id)
            )

        self.assertEqual(response.status_code, 503)

    def test_config_lists_prices_only_when_ready(self) -> None:
        data = self.client().get("/api/v1/billing/config").json()

        self.assertTrue(data["enabled"])
        self.assertEqual(data["prices"]["Pro"]["year"], PRO_YEAR)
        self.assertEqual(data["environment"], "sandbox")

        with mock.patch.object(settings, "paddle_client_token", ""):
            data = self.client().get("/api/v1/billing/config").json()

        self.assertFalse(data["enabled"])
        self.assertEqual(data["prices"], {})

    def test_status_and_portal(self) -> None:
        self.current_user = self.user
        client = self.client()

        data = client.get("/api/v1/billing/status").json()
        self.assertIsNone(data["subscription"])
        self.assertEqual(client.post("/api/v1/billing/portal").status_code, 404)

        self.apply(event("subscription.created", user_id=self.user.id))
        data = client.get("/api/v1/billing/status").json()
        self.assertEqual(data["subscription"]["plan"], "Pro")
        self.assertEqual(data["user_id"], self.user.id)

        with mock.patch.object(
            paddle_billing, "create_portal_url", return_value="https://portal/x"
        ) as portal:
            response = client.post("/api/v1/billing/portal")

        self.assertEqual(response.json(), {"url": "https://portal/x"})
        portal.assert_called_once_with("ctm_1", ["sub_1"])


class DeletionTests(PaddleCase):
    def test_deleting_an_account_cancels_the_subscription_first(self) -> None:
        from app.services.account_deletion import delete_account

        self.apply(event("subscription.created", user_id=self.user.id))

        with mock.patch.object(paddle_billing, "cancel_subscription_now") as cancel:
            paddle_billing.stop_subscriptions_for_deletion(self.db, self.user.id)

        cancel.assert_called_once_with("sub_1")

        delete_account(self.db, self.user)
        self.assertEqual(list(self.db.scalars(select(PaddleSubscription))), [])

    def test_if_paddle_cannot_cancel_the_error_is_raised(self) -> None:
        self.apply(event("subscription.created", user_id=self.user.id))

        with mock.patch.object(
            paddle_billing,
            "cancel_subscription_now",
            side_effect=paddle_billing.PaddleApiError("x"),
        ):
            with self.assertRaises(paddle_billing.PaddleApiError):
                paddle_billing.stop_subscriptions_for_deletion(self.db, self.user.id)


if __name__ == "__main__":
    unittest.main()
