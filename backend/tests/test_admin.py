import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core import security
from app.core.config import settings
from app.main import app
from app.models.asset import Asset
from app.models.base import Base
from app.models.credit_entry import CreditEntry
from app.models.feedback import FeedbackEntry
from app.models.scan_job import ScanJob
from app.models.user import User
from app.models.user_event import UserEvent
from app.models.user_suspension import UserSuspension
from app.services import paddle_billing, user_events

ORIGIN = "http://localhost:3000"
GOOD = "correct-horse-battery"
ADMIN = "boss@example.com"


def token_for(user_id: int, *, seconds_ago: int = 5, via: str | None = None):
    issued = datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)
    claims = {
        "sub": str(user_id),
        "iat": issued,
        "exp": issued + timedelta(seconds=security.TOKEN_TTL_SECONDS),
        "iss": security.TOKEN_ISSUER,
        "aud": security.TOKEN_AUDIENCE,
    }

    if via:
        claims["via"] = via

    return jwt.encode(
        claims, security.get_auth_secret(), algorithm=security.ALGORITHM
    )


class AdminTests(unittest.TestCase):
    def setUp(self) -> None:
        for patcher in (
            mock.patch.dict(
                os.environ, {"AUTH_SECRET_KEY": "k" * 40}, clear=False
            ),
            mock.patch.object(settings, "allowed_origins", [ORIGIN]),
            mock.patch.object(settings, "admin_emails", {ADMIN}),
            mock.patch.object(settings, "admin_require_google", True),
            mock.patch.object(settings, "admin_session_minutes", 120),
            mock.patch.object(settings, "trusted_proxy_hops", 2),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine)

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_db
        self.addCleanup(app.dependency_overrides.clear)

        self.client = TestClient(app, headers={"Origin": ORIGIN})
        self.ids = {}

        for email in (ADMIN, "ann@example.com", "bob@example.com"):
            r = self.client.post(
                "/api/v1/auth/register",
                json={"email": email, "password": GOOD},
                headers={"X-Forwarded-For": "9.9.9.9, 1.2.3.4, 10.0.0.1"},
            )
            self.assertEqual(r.status_code, 201, r.text)
            self.ids[email] = r.json()["id"]

        self.admin_token = token_for(self.ids[ADMIN], via="google")

    def get(self, path, token=None, **kwargs):
        token = token or self.admin_token

        return TestClient(app).get(
            f"/api/v1/admin{path}",
            headers={"Authorization": f"Bearer {token}"},
            **kwargs,
        )

    def post(self, path, json=None, token=None):
        token = token or self.admin_token

        return TestClient(app).post(
            f"/api/v1/admin{path}",
            json=json or {},
            headers={"Authorization": f"Bearer {token}"},
        )

    # --- who gets in -----------------------------------------------------

    def test_anonymous_is_refused_and_ordinary_users_see_not_found(self):
        self.assertEqual(
            TestClient(app).get("/api/v1/admin/overview").status_code, 401
        )

        ann = token_for(self.ids["ann@example.com"], via="google")
        self.assertEqual(self.get("/overview", token=ann).status_code, 404)
        self.assertEqual(self.get("/users", token=ann).status_code, 404)

    def test_admin_needs_a_recent_google_sign_in(self):
        mine = self.ids[ADMIN]

        password_only = token_for(mine)
        r = self.get("/me", token=password_only)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["detail"], "admin_google_signin_required")

        stale = token_for(mine, via="google", seconds_ago=3 * 3600)
        self.assertEqual(self.get("/me", token=stale).status_code, 403)

        self.assertEqual(self.get("/me").status_code, 200)
        self.assertEqual(self.get("/me").json()["email"], ADMIN)

    def test_google_requirement_can_be_switched_off_for_development(self):
        with mock.patch.object(settings, "admin_require_google", False):
            r = self.get("/me", token=token_for(self.ids[ADMIN]))

        self.assertEqual(r.status_code, 200)

    def test_me_tells_the_app_who_is_an_admin(self):
        def me(email):
            token = token_for(self.ids[email])

            return TestClient(app).get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            ).json()

        self.assertTrue(me(ADMIN)["is_admin"])
        self.assertFalse(me("ann@example.com")["is_admin"])

    def test_a_renewed_session_is_not_a_fresh_google_sign_in(self):
        old = token_for(self.ids[ADMIN], via="google", seconds_ago=25 * 3600)
        client = TestClient(app, headers={"Origin": ORIGIN})
        client.cookies.set("tma_session", old, path="/api/v1")

        me = client.get("/api/v1/auth/me")
        self.assertEqual(me.status_code, 200)

        renewed = me.cookies.get("tma_session")
        self.assertIsNotNone(renewed)
        self.assertIsNone(security.decode_access_token_details(renewed)[2])

    # --- activity log ----------------------------------------------------

    def events(self, **filters):
        with self.Session() as db:
            stmt = select(UserEvent).order_by(UserEvent.id)

            for key, value in filters.items():
                stmt = stmt.where(getattr(UserEvent, key) == value)

            return list(db.scalars(stmt))

    def test_sign_up_and_sign_in_are_logged_with_the_visitors_ip(self):
        signups = self.events(event_type=user_events.REGISTER)
        self.assertEqual(len(signups), 3)
        # Read from the right: the entry our own proxies added, never the
        # value a visitor wrote at the left.
        self.assertEqual(signups[0].ip_address, "1.2.3.4")

        ok = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": GOOD},
            headers={"User-Agent": "TestBrowser/1.0"},
        )
        self.assertEqual(ok.status_code, 200)

        bad = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": "wrong-password"},
        )
        self.assertEqual(bad.status_code, 401)

        nobody = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": "whatever-123"},
        )
        self.assertEqual(nobody.status_code, 401)

        login = self.events(event_type=user_events.LOGIN)[0]
        self.assertEqual(login.user_agent, "TestBrowser/1.0")
        self.assertEqual(login.user_id, self.ids["ann@example.com"])

        failed = self.events(event_type=user_events.LOGIN_FAILED)
        self.assertEqual(len(failed), 2)
        self.assertEqual(failed[1].email, "ghost@example.com")
        self.assertIsNone(failed[1].user_id)

    def test_feedback_and_password_reset_are_logged(self):
        ann = token_for(self.ids["ann@example.com"])

        r = TestClient(app).post(
            "/api/v1/feedback",
            json={"kind": "general", "message": "Lovely app"},
            headers={"Authorization": f"Bearer {ann}"},
        )
        self.assertEqual(r.status_code, 201, r.text)

        self.client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "ann@example.com"},
        )

        self.assertEqual(len(self.events(event_type=user_events.FEEDBACK)), 1)
        self.assertEqual(
            len(self.events(event_type=user_events.PASSWORD_RESET_REQUESTED)),
            1,
        )

    def test_old_events_are_purged_and_recent_ones_kept(self):
        with self.Session() as db:
            db.add(
                UserEvent(
                    event_type="login",
                    email="old@example.com",
                    created_at=datetime.now(timezone.utc)
                    - timedelta(days=settings.event_retention_days + 1),
                )
            )
            db.commit()

            removed = user_events.purge_old_events(db)

        self.assertEqual(removed, 1)
        self.assertEqual(self.events(email="old@example.com"), [])
        self.assertEqual(len(self.events(event_type="register")), 3)

    # --- the pages -------------------------------------------------------

    def test_overview_counts(self):
        body = self.get("/overview").json()

        self.assertEqual(body["users_total"], 3)
        self.assertEqual(body["users_new_24h"], 3)
        self.assertEqual(body["users_active_24h"], 3)
        self.assertEqual(body["failed_sign_ins_24h"], 0)
        self.assertEqual(len(body["sign_ups_by_day"]), 14)
        self.assertEqual(body["sign_ups_by_day"][-1][1], 3)
        self.assertEqual(body["event_retention_days"], 90)
        self.assertEqual(
            body["serpapi"]["daily_limit"], settings.serpapi_daily_limit
        )

    def test_overview_activation_and_verdicts(self):
        ann = self.ids["ann@example.com"]
        bob = self.ids["bob@example.com"]

        with self.Session() as db:
            # Ann added an artwork and has a scan; Bob added an artwork only.
            ann_asset = Asset(user_id=ann, title="a", original_url="u1")
            bob_asset = Asset(user_id=bob, title="b", original_url="u2")
            db.add_all([ann_asset, bob_asset])
            db.flush()
            db.add(ScanJob(asset_id=ann_asset.id, provider="fake"))

            for match_id, verdict in ((1, "useful"), (2, "useful"), (3, "different")):
                db.add(
                    FeedbackEntry(
                        user_id=ann,
                        kind="match_verdict",
                        match_id=match_id,
                        verdict=verdict,
                    )
                )

            # Not a match verdict, and an old verdict: neither is counted.
            db.add(FeedbackEntry(user_id=bob, kind="general", message="hi"))
            db.add(
                FeedbackEntry(
                    user_id=bob,
                    kind="match_verdict",
                    match_id=9,
                    verdict="unrelated",
                    created_at=datetime.now(timezone.utc) - timedelta(days=20),
                )
            )
            db.commit()

        body = self.get("/overview").json()

        # Three accounts exist, all created just now.
        self.assertEqual(
            body["activation_7d"],
            {"new_users": 3, "with_artwork": 2, "with_scan": 1},
        )
        self.assertEqual(body["activation_30d"], body["activation_7d"])
        self.assertEqual(
            body["match_verdicts_7d"], {"useful": 2, "different": 1}
        )

    def test_user_list_search_and_detail(self):
        body = self.get("/users").json()
        self.assertEqual(body["total"], 3)
        self.assertEqual(body["items"][0]["email"], "bob@example.com")

        found = self.get("/users", params={"q": "ANN@"}).json()
        self.assertEqual([u["email"] for u in found["items"]], ["ann@example.com"])
        self.assertIsNotNone(found["items"][0]["last_sign_in"])
        self.assertTrue(self.get("/users").json()["items"][2]["is_admin"])

        detail = self.get(f"/users/{self.ids['ann@example.com']}").json()
        self.assertEqual(detail["user"]["email"], "ann@example.com")
        self.assertEqual(detail["ips"][0]["ip_address"], "1.2.3.4")
        self.assertEqual(detail["events"][0]["event_type"], "register")

        self.assertEqual(self.get("/users/9999").status_code, 404)

    def test_feedback_list_shows_who_wrote_it(self):
        with self.Session() as db:
            db.add(
                FeedbackEntry(
                    user_id=self.ids["bob@example.com"],
                    kind="general",
                    message="Needs a dark mode",
                )
            )
            db.add(
                FeedbackEntry(
                    user_id=self.ids["bob@example.com"],
                    kind="beta_survey",
                    answers_json='{"easy": "yes"}',
                )
            )
            db.commit()

        everything = self.get("/feedback").json()
        self.assertEqual(everything["total"], 2)
        self.assertEqual(everything["items"][0]["email"], "bob@example.com")
        self.assertEqual(everything["items"][0]["answers"], {"easy": "yes"})

        only = self.get("/feedback", params={"kind": "general"}).json()
        self.assertEqual(only["total"], 1)
        self.assertEqual(only["items"][0]["message"], "Needs a dark mode")

    def test_event_search_by_ip_and_email(self):
        by_ip = self.get("/events", params={"q": "1.2.3"}).json()
        self.assertEqual(by_ip["total"], 3)

        by_mail = self.get("/events", params={"q": "bob@"}).json()
        self.assertEqual(by_mail["total"], 1)

        typed = self.get("/events", params={"event_type": "login"}).json()
        self.assertEqual(typed["total"], 0)

    # --- actions ---------------------------------------------------------

    def test_adding_credits_changes_the_balance_and_is_logged(self):
        ann = self.ids["ann@example.com"]

        self.assertEqual(
            self.post(f"/users/{ann}/credits", {"amount": 5}).status_code, 200
        )
        self.assertEqual(
            self.post(f"/users/{ann}/credits", {"amount": 0}).status_code, 422
        )

        with self.Session() as db:
            total = sum(
                db.scalars(
                    select(CreditEntry.delta).where(CreditEntry.user_id == ann)
                )
            )

        self.assertEqual(total, 5)

        actions = self.events(event_type=user_events.ADMIN_ACTION)
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0].user_id, self.ids[ADMIN])
        self.assertIn("+5 credits", actions[0].detail)

    def test_removing_credits_never_goes_below_zero_and_is_logged(self):
        ann = self.ids["ann@example.com"]

        def balance():
            with self.Session() as db:
                return sum(
                    db.scalars(
                        select(CreditEntry.delta).where(
                            CreditEntry.user_id == ann
                        )
                    )
                )

        self.post(f"/users/{ann}/credits", {"amount": 5})
        self.assertEqual(
            self.post(
                f"/users/{ann}/remove-credits",
                {"amount": 2, "note": "Partial refund"},
            ).status_code,
            200,
        )
        before = balance()

        too_many = self.post(
            f"/users/{ann}/remove-credits", {"amount": before + 1}
        )
        self.assertEqual(too_many.status_code, 400)
        self.assertIn(f"Only {before} credit(s)", too_many.json()["detail"])
        self.assertEqual(
            self.post(f"/users/{ann}/remove-credits", {"amount": 0}).status_code,
            422,
        )
        self.assertEqual(balance(), before)

        with self.Session() as db:
            removal = db.scalars(
                select(CreditEntry).where(
                    CreditEntry.user_id == ann, CreditEntry.reason == "removal"
                )
            ).one()
        self.assertEqual(removal.delta, -2)
        self.assertEqual(removal.note, "Partial refund")

        details = [e.detail for e in self.events(event_type=user_events.ADMIN_ACTION)]
        self.assertTrue(any("-2 credits" in d for d in details))

    def test_plan_change(self):
        ann = self.ids["ann@example.com"]

        self.assertEqual(
            self.post(f"/users/{ann}/plan", {"plan_type": "Pro"}).status_code,
            200,
        )
        self.assertEqual(
            self.post(f"/users/{ann}/plan", {"plan_type": "Gold"}).status_code,
            422,
        )

        with self.Session() as db:
            self.assertEqual(db.get(User, ann).plan_type, "Pro")

    def test_suspending_blocks_sign_in_and_existing_sessions(self):
        ann = self.ids["ann@example.com"]
        before = token_for(ann, seconds_ago=60)

        self.assertEqual(
            TestClient(app)
            .get("/api/v1/auth/me", headers={"Authorization": f"Bearer {before}"})
            .status_code,
            200,
        )

        r = self.post(f"/users/{ann}/suspend", {"reason": "abuse"})
        self.assertEqual(r.status_code, 200)

        me = TestClient(app).get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {before}"}
        )
        self.assertEqual(me.status_code, 401)  # sessions ended

        # A session that somehow outlives the suspension is still refused.
        bob = self.ids["bob@example.com"]

        with self.Session() as db:
            db.add(UserSuspension(user_id=bob))
            db.commit()

        me = TestClient(app).get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_for(bob)}"},
        )
        self.assertEqual(me.status_code, 403)

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": GOOD},
        )
        self.assertEqual(login.status_code, 403)

        detail = self.get(f"/users/{ann}").json()
        self.assertTrue(detail["user"]["suspended"])
        self.assertEqual(detail["suspension_reason"], "abuse")

        self.assertEqual(self.post(f"/users/{ann}/unsuspend").status_code, 200)

        again = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": GOOD},
        )
        self.assertEqual(again.status_code, 200)

        with self.Session() as db:
            self.assertIsNone(db.get(UserSuspension, ann))

    def test_deleting_a_user_needs_the_email_and_removes_the_account(self):
        ann = self.ids["ann@example.com"]

        wrong = self.post(f"/users/{ann}/delete", {"confirm_email": "x@y.com"})
        self.assertEqual(wrong.status_code, 422)

        with self.Session() as db:
            self.assertIsNotNone(db.get(User, ann))

        r = self.post(
            f"/users/{ann}/delete", {"confirm_email": " Ann@Example.com "}
        )
        self.assertEqual(r.status_code, 200, r.text)

        with self.Session() as db:
            self.assertIsNone(db.get(User, ann))
            self.assertIsNotNone(db.get(User, self.ids["bob@example.com"]))

        self.assertEqual(self.get(f"/users/{ann}").status_code, 404)

    def test_an_admin_cannot_be_deleted(self):
        r = self.post(
            f"/users/{self.ids[ADMIN]}/delete", {"confirm_email": ADMIN}
        )

        self.assertEqual(r.status_code, 422)

        with self.Session() as db:
            self.assertIsNotNone(db.get(User, self.ids[ADMIN]))

    def test_an_admin_cannot_be_suspended(self):
        r = self.post(f"/users/{self.ids[ADMIN]}/suspend")

        self.assertEqual(r.status_code, 422)

    def test_revoke_sessions_signs_the_user_out(self):
        bob = self.ids["bob@example.com"]
        old = token_for(bob, seconds_ago=120)

        self.assertEqual(
            self.post(f"/users/{bob}/revoke-sessions").status_code, 200
        )
        self.assertEqual(
            TestClient(app)
            .get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old}"})
            .status_code,
            401,
        )

    def test_an_unknown_user_is_not_found(self):
        self.assertEqual(
            self.post("/users/999/credits", {"amount": 1}).status_code, 404
        )


    # --- billing ---------------------------------------------------------

    def paddle(self, payload):
        with self.Session() as db:
            return paddle_billing.handle_event(db, payload)

    def subscribe(self, email, *, sub, amount="1299", interval="month",
                  status="active", scheduled=None, event_id=None):
        now = datetime.now(timezone.utc)
        return self.paddle({
            "event_id": event_id or f"evt_{sub}",
            "event_type": "subscription.created",
            "occurred_at": now.isoformat(),
            "data": {
                "id": sub,
                "status": status,
                "customer_id": f"ctm_{sub}",
                "custom_data": {"user_id": str(self.ids[email])},
                "started_at": (now - timedelta(days=3)).isoformat(),
                "items": [{"price": {
                    "id": f"pri_{amount}",
                    "unit_price": {"amount": amount, "currency_code": "USD"},
                    "billing_cycle": {"interval": interval, "frequency": 1},
                }}],
                "current_billing_period": {
                    "ends_at": (now + timedelta(days=27)).isoformat(),
                },
                "scheduled_change": scheduled,
            },
        })

    def pay(self, email, *, txn, total, billed_at=None, sub=None,
            amount="499", currency="USD"):
        price = {
            "id": f"pri_{amount}",
            "unit_price": {"amount": amount, "currency_code": "USD"},
            "billing_cycle": (
                {"interval": "month", "frequency": 1} if sub else None
            ),
        }
        return self.paddle({
            "event_id": f"evt_{txn}",
            "event_type": "transaction.completed",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "data": {
                "id": txn,
                "status": "completed",
                "customer_id": f"ctm_{sub or txn}",
                "subscription_id": sub,
                "custom_data": {"user_id": str(self.ids[email])},
                "billed_at": (
                    billed_at or datetime.now(timezone.utc)
                ).isoformat(),
                "items": [{"quantity": 1, "price": price}],
                "details": {"totals": {
                    "subtotal": total, "tax": "0", "total": total,
                    "grand_total": total, "currency_code": currency,
                }},
            },
        })

    def refund_payment(self, txn, *, total, action="refund"):
        now = datetime.now(timezone.utc).isoformat()
        return self.paddle({
            "event_id": f"evt_adj_{txn}",
            "event_type": "adjustment.updated",
            "occurred_at": now,
            "data": {
                "id": f"adj_{txn}",
                "transaction_id": txn,
                "action": action,
                "type": "full",
                "status": "approved",
                "reason": "Asked for it",
                "created_at": now,
                "updated_at": now,
                "totals": {"total": total, "currency_code": "USD"},
            },
        })

    def test_user_detail_shows_subscription_and_payments(self):
        ann = self.ids["ann@example.com"]
        self.subscribe("ann@example.com", sub="sub_a")
        self.pay("ann@example.com", txn="txn_plan", total="1299",
                 sub="sub_a", amount="1299")
        self.pay("ann@example.com", txn="txn_pack", total="499")
        self.refund_payment("txn_pack", total="499")

        detail = self.get(f"/users/{ann}").json()

        [subscription] = detail["subscriptions"]
        self.assertEqual(
            (subscription["status"], subscription["plan"],
             subscription["interval"]),
            ("active", "Pro", "month"),
        )
        self.assertTrue(subscription["has_access"])
        self.assertIsNotNone(subscription["current_period_end"])

        payments = {p["transaction_id"]: p for p in detail["payments"]}
        self.assertEqual(payments["txn_plan"]["kind"], "plan")
        self.assertEqual(payments["txn_plan"]["total"], 1299)
        self.assertEqual(payments["txn_plan"]["refunded"], 0)
        self.assertEqual(payments["txn_pack"]["kind"], "pack")
        self.assertEqual(payments["txn_pack"]["credits"], 10)
        self.assertEqual(payments["txn_pack"]["refunded"], 499)
        self.assertEqual(
            payments["txn_pack"]["adjustments"][0]["reason"], "Asked for it"
        )
        self.assertEqual(
            detail["paid_totals"],
            [{"currency_code": "USD", "payments": 2, "total": 1798,
              "refunded": 499}],
        )

        row = detail["user"]
        self.assertEqual(row["plan_type"], "Pro")
        self.assertEqual(row["subscription_status"], "active")
        self.assertIsNotNone(row["renews_at"])
        self.assertIsNone(row["cancels_at"])

        # Someone who never paid has empty billing sections.
        bob = self.get(f"/users/{self.ids['bob@example.com']}").json()
        self.assertEqual(
            (bob["subscriptions"], bob["payments"], bob["paid_totals"]),
            ([], [], []),
        )
        self.assertIsNone(bob["user"]["subscription_status"])

    def test_a_scheduled_cancellation_shows_the_end_date(self):
        ends = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        self.subscribe(
            "ann@example.com", sub="sub_a",
            scheduled={"action": "cancel", "effective_at": ends},
        )

        row = self.get(f"/users/{self.ids['ann@example.com']}").json()["user"]

        self.assertIsNotNone(row["cancels_at"])
        self.assertIsNone(row["renews_at"])

    def test_user_list_filters_by_plan_subscription_and_payment(self):
        ends = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        self.subscribe("ann@example.com", sub="sub_a")
        self.subscribe(
            "bob@example.com", sub="sub_b", amount="2999",
            scheduled={"action": "cancel", "effective_at": ends},
        )
        self.pay("bob@example.com", txn="txn_b", total="2999",
                 sub="sub_b", amount="2999")

        def emails(**params):
            items = self.get("/users", params=params).json()["items"]
            return sorted(u["email"] for u in items)

        self.assertEqual(emails(plan="Extra"), ["bob@example.com"])
        self.assertEqual(emails(subscription="active"), ["ann@example.com"])
        self.assertEqual(emails(subscription="canceling"), ["bob@example.com"])
        self.assertEqual(emails(subscription="none"), [ADMIN])
        self.assertEqual(emails(paid="true"), ["bob@example.com"])
        self.assertEqual(
            emails(paid="false"), sorted([ADMIN, "ann@example.com"])
        )
        self.assertEqual(
            emails(plan="Pro", q="bob"), [],
        )
        self.assertEqual(
            self.get("/users", params={"subscription": "x"}).status_code, 422
        )

        listed = {
            u["email"]: u for u in self.get("/users").json()["items"]
        }
        self.assertEqual(listed["bob@example.com"]["subscription_plan"], "Extra")
        self.assertEqual(
            listed["ann@example.com"]["subscription_interval"], "month"
        )

    def test_overview_revenue_and_subscribers(self):
        now = datetime.now(timezone.utc)
        last_month = (now.replace(day=1) - timedelta(days=3))
        ends = (now + timedelta(days=5)).isoformat()

        self.subscribe("ann@example.com", sub="sub_a")
        self.subscribe(
            "bob@example.com", sub="sub_b", amount="2999",
            scheduled={"action": "cancel", "effective_at": ends},
        )
        self.subscribe(
            ADMIN, sub="sub_c", status="canceled", event_id="evt_c",
        )
        self.pay("ann@example.com", txn="txn_1", total="1299",
                 sub="sub_a", amount="1299")
        self.pay("bob@example.com", txn="txn_2", total="2999",
                 sub="sub_b", amount="2999")
        self.pay("bob@example.com", txn="txn_3", total="499")
        self.pay("bob@example.com", txn="txn_old", total="1299",
                 billed_at=last_month, sub="sub_b", amount="1299")
        self.pay("ann@example.com", txn="txn_eur", total="1100",
                 currency="EUR")
        self.refund_payment("txn_3", total="499")

        body = self.get("/overview").json()

        self.assertEqual(body["paid_subscribers"], 2)
        self.assertEqual(
            body["paid_subscribers_by_plan"], {"Extra": 1, "Pro": 1}
        )
        self.assertEqual(body["subscriptions_canceling"], 1)
        self.assertEqual(body["subscriptions_past_due"], 0)

        revenue = {r["currency_code"]: r for r in body["revenue_this_month"]}
        self.assertEqual(
            revenue["USD"],
            {"currency_code": "USD", "payments": 3, "total": 4797,
             "refunded": 499, "net": 4298},
        )
        self.assertEqual(revenue["EUR"]["total"], 1100)
        self.assertEqual(
            body["revenue_last_month"],
            [{"currency_code": "USD", "payments": 1, "total": 1299,
              "refunded": 0, "net": 1299}],
        )

    def test_overview_without_payments(self):
        body = self.get("/overview").json()

        self.assertEqual(body["revenue_this_month"], [])
        self.assertEqual(body["paid_subscribers"], 0)
        self.assertEqual(body["paid_subscribers_by_plan"], {})


if __name__ == "__main__":
    unittest.main()
