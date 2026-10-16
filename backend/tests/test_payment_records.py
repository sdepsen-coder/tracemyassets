"""Completed Paddle payments and refunds are kept for the admin pages."""

import importlib.util
import json
from pathlib import Path

from sqlalchemy import select

from app.api.v1.endpoints.billing import router as billing_router
from app.models.paddle import PaddleAdjustment, PaddleTransaction
from test_credit_packs import one_time, paid, refund
from test_paddle_billing import PaddleCase, event, price, sign


def totals(total: str, *, tax: str = "0", currency: str = "USD", **extra):
    return {
        "totals": {
            "subtotal": str(int(total) - int(tax)),
            "tax": tax,
            "total": total,
            "grand_total": total,
            "currency_code": currency,
            **extra,
        }
    }


def with_totals(payload: dict, details: dict, **data) -> dict:
    payload["data"]["details"] = details
    payload["data"].update(data)

    return payload


class PaymentRecordTests(PaddleCase):
    def payments(self) -> list[PaddleTransaction]:
        self.db.expire_all()

        return list(self.db.scalars(select(PaddleTransaction)))

    def adjustments(self) -> list[PaddleAdjustment]:
        self.db.expire_all()

        return list(self.db.scalars(select(PaddleAdjustment)))

    def test_a_pack_payment_is_kept_with_paddles_totals(self) -> None:
        payload = with_totals(
            paid(user_id=self.user.id),
            totals("599", tax="100", fee="80", earnings="419"),
            billed_at="2026-10-14T09:59:00Z",
            origin="web",
        )

        self.apply(payload)

        [row] = self.payments()
        self.assertEqual(row.user_id, self.user.id)
        self.assertEqual((row.kind, row.credits, row.plan), ("pack", 10, None))
        self.assertEqual(
            (row.currency_code, row.subtotal, row.tax, row.total),
            ("USD", 499, 100, 599),
        )
        self.assertEqual((row.fee, row.earnings), (80, 419))
        self.assertEqual(row.origin, "web")
        self.assertEqual(row.billed_at.strftime("%Y-%m-%d %H:%M"), "2026-10-14 09:59")
        # The credits are still added as before.
        self.assertEqual(self.balance(), 10)

    def test_the_same_payment_is_kept_once(self) -> None:
        payload = with_totals(paid(user_id=self.user.id), totals("499"))

        self.apply(payload)
        self.assertEqual(self.apply(payload), "duplicate")

        # Paddle can also resend it under a new event id.
        again = with_totals(
            paid(user_id=self.user.id, event_id="evt_t9"), totals("499")
        )
        self.apply(again)

        self.assertEqual(len(self.payments()), 1)
        self.assertEqual(self.balance(), 10)

    def test_amounts_come_from_paddle_not_from_our_prices(self) -> None:
        # A localised price in euros: kept exactly as Paddle reports it.
        payload = with_totals(
            paid(user_id=self.user.id), totals("1189", tax="190", currency="eur")
        )

        self.apply(payload)

        [row] = self.payments()
        self.assertEqual((row.currency_code, row.total, row.tax), ("EUR", 1189, 190))

    def test_a_plan_payment_is_kept_as_a_plan(self) -> None:
        payload = with_totals(
            paid(
                user_id=self.user.id,
                price_obj=price("pri_pro_month", "1299", "month"),
            ),
            totals("1299"),
            subscription_id="sub_1",
            origin="subscription_recurring",
        )

        self.assertIn("not a credit pack", self.apply(payload))

        [row] = self.payments()
        self.assertEqual(
            (row.kind, row.plan, row.interval, row.subscription_id),
            ("plan", "Pro", "month", "sub_1"),
        )
        self.assertEqual(self.balance(), 0)

    def test_unfinished_payments_are_not_kept(self) -> None:
        self.apply(
            with_totals(paid(user_id=self.user.id, status="paid"), totals("499"))
        )

        self.assertEqual(self.payments(), [])

    def test_a_renewal_is_matched_through_its_subscription(self) -> None:
        self.apply(event("subscription.created", user_id=self.user.id))

        payload = with_totals(
            paid(
                user_id=self.user.id,
                event_id="evt_r1",
                price_obj=price("pri_pro_month", "1299", "month"),
            ),
            totals("1299"),
            subscription_id="sub_1",
        )
        payload["data"]["custom_data"] = None

        self.apply(payload)

        self.assertEqual(self.payments()[0].user_id, self.user.id)

    def test_an_unmatched_payment_is_kept_and_claimed_later(self) -> None:
        payload = with_totals(
            paid(
                user_id=99999,
                txn="txn_early",
                price_obj=price("pri_pro_month", "1299", "month"),
            ),
            totals("1299"),
            subscription_id="sub_1",
        )

        self.apply(payload)
        self.assertIsNone(self.payments()[0].user_id)

        self.apply(
            event("subscription.created", user_id=self.user.id, event_id="evt_s")
        )
        self.assertEqual(self.payments()[0].user_id, self.user.id)

    def test_a_refund_is_kept_against_the_payment(self) -> None:
        self.apply(with_totals(paid(user_id=self.user.id), totals("499")))

        pending = refund(
            event_id="evt_a0", status="pending_approval",
            kind_event="adjustment.created",
        )
        pending["data"].update(
            totals={"total": "499", "currency_code": "USD"},
            reason="Customer asked",
            created_at="2026-10-15T09:00:00Z",
            updated_at="2026-10-15T09:00:00Z",
        )
        self.apply(pending)

        [row] = self.adjustments()
        self.assertEqual((row.status, row.total), ("pending_approval", 499))
        self.assertEqual(row.user_id, self.user.id)
        self.assertEqual(self.balance(), 10)

        approved = refund(event_id="evt_a1")
        approved["data"].update(
            totals={"total": "499", "currency_code": "USD"},
            created_at="2026-10-15T09:00:00Z",
            updated_at="2026-10-15T11:00:00Z",
        )
        self.apply(approved)

        [row] = self.adjustments()
        self.assertEqual((row.action, row.type, row.status), ("refund", "full", "approved"))
        self.assertEqual(row.transaction_id, "txn_1")
        self.assertEqual(self.balance(), 0)

        # The older "pending" arriving again under another id changes nothing.
        pending["event_id"] = "evt_a_late"
        self.apply(pending)
        self.assertEqual(self.adjustments()[0].status, "approved")

    def test_a_refund_without_amounts_takes_the_payments_currency(self) -> None:
        self.apply(
            with_totals(paid(user_id=self.user.id), totals("499", currency="EUR"))
        )
        self.apply(refund())

        [row] = self.adjustments()
        self.assertEqual((row.currency_code, row.total), ("EUR", 0))

    def test_a_chargeback_on_a_plan_payment_is_kept(self) -> None:
        self.apply(
            with_totals(
                paid(
                    user_id=self.user.id,
                    price_obj=price("pri_pro_month", "1299", "month"),
                ),
                totals("1299"),
            )
        )
        chargeback = refund(action="chargeback")
        chargeback["data"]["totals"] = {"total": "1299", "currency_code": "USD"}

        self.assertIn("no credit purchase", self.apply(chargeback))

        [row] = self.adjustments()
        self.assertEqual((row.action, row.total), ("chargeback", 1299))

    def test_the_signed_webhook_records_the_payment(self) -> None:
        client = self._client(billing_router)
        body = json.dumps(
            with_totals(paid(user_id=self.user.id), totals("499"))
        ).encode()

        refused = client.post("/api/v1/billing/webhook", content=body)
        self.assertEqual(refused.status_code, 400)
        self.assertEqual(self.payments(), [])

        response = client.post(
            "/api/v1/billing/webhook",
            content=body,
            headers={"Paddle-Signature": sign(body)},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(self.payments()), 1)

    def test_a_pack_found_only_by_custom_data_is_a_pack(self) -> None:
        payload = with_totals(
            paid(
                user_id=self.user.id,
                price_obj=one_time("pri_x", "777", custom_data={"credits": 7}),
            ),
            totals("777"),
        )

        self.apply(payload)

        self.assertEqual(
            (self.payments()[0].kind, self.payments()[0].credits), ("pack", 7)
        )


def load_backfill():
    path = Path(__file__).resolve().parent.parent / "scripts" / "backfill_paddle_payments.py"
    spec = importlib.util.spec_from_file_location("backfill_paddle_payments", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    return module


class BackfillTests(PaddleCase):
    def test_past_payments_are_recorded_page_by_page_without_credits(self) -> None:
        backfill = load_backfill()
        first = with_totals(paid(user_id=self.user.id, txn="txn_a"), totals("499"))["data"]
        second = with_totals(paid(user_id=self.user.id, txn="txn_b"), totals("999"))["data"]
        adjustment = refund("txn_a")["data"]
        adjustment["totals"] = {"total": "499", "currency_code": "USD"}
        calls = []

        def fetch(url, params):
            calls.append((url, params))

            if url.endswith("/transactions"):
                return {
                    "data": [first],
                    "meta": {"pagination": {"has_more": True, "next": "https://p/next"}},
                }

            if url == "https://p/next":
                return {"data": [second], "meta": {"pagination": {"has_more": False}}}

            return {"data": [adjustment], "meta": {"pagination": {"has_more": False}}}

        counts = backfill.backfill(self.db, fetch)

        self.assertEqual(counts["payments"], 2)
        self.assertEqual(counts["adjustments"], 1)
        self.assertEqual(calls[0][1], {"status": "completed"})
        self.assertIsNone(calls[1][1])
        self.assertEqual(
            sorted(row.transaction_id for row in self.db.scalars(select(PaddleTransaction))),
            ["txn_a", "txn_b"],
        )
        # Recording only: no credits added or taken.
        self.assertEqual(self.balance(), 0)

        # A second run finds them already there.
        self.assertEqual(backfill.backfill(self.db, fetch)["payments_skipped"], 2)
