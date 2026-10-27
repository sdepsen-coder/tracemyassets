"""One-time Deep scan credit packs bought through Paddle."""

import unittest
from unittest import mock

from sqlalchemy import select

from app.core.config import settings
from app.models.credit_entry import CreditEntry
from app.services import credits, paddle_billing
from test_paddle_billing import PaddleCase, price

PACK_10 = "pri_pack_10"
PACK_25 = "pri_pack_25"


def one_time(price_id: str, amount: str, **extra) -> dict:
    return {
        "id": price_id,
        "product_id": "pro_pack",
        "status": "active",
        "unit_price": {"amount": amount, "currency_code": "USD"},
        "billing_cycle": None,
        **extra,
    }


def paid(
    *,
    user_id: int,
    txn: str = "txn_1",
    event_id: str = "evt_t1",
    price_obj: dict | None = None,
    quantity: int = 1,
    status: str = "completed",
    grand_total: str | None = None,
) -> dict:
    details = (
        {"totals": {"grand_total": grand_total, "currency_code": "USD"}}
        if grand_total
        else {}
    )

    return {
        "event_id": event_id,
        "event_type": "transaction.completed",
        "occurred_at": "2026-10-14T10:00:00Z",
        "data": {
            "id": txn,
            "status": status,
            "details": details,
            "customer_id": "ctm_1",
            "subscription_id": None,
            "custom_data": {"user_id": str(user_id)},
            "items": [
                {
                    "quantity": quantity,
                    "price": price_obj or one_time(PACK_10, "499"),
                }
            ],
        },
    }


def refund(
    txn: str = "txn_1",
    *,
    event_id: str = "evt_a1",
    status: str = "approved",
    action: str = "refund",
    kind: str = "full",
    kind_event: str = "adjustment.updated",
    total: str | None = None,
    adjustment: str = "adj_1",
) -> dict:
    data = {
        "id": adjustment,
        "transaction_id": txn,
        "status": status,
        "action": action,
        "type": kind,
    }

    if total:
        data["totals"] = {"total": total, "currency_code": "USD"}

    return {
        "event_id": event_id,
        "event_type": kind_event,
        "occurred_at": "2026-10-15T10:00:00Z",
        "data": data,
    }


class ClassifyPackTests(unittest.TestCase):
    def test_packs_are_found_by_amount(self) -> None:
        self.assertEqual(paddle_billing.classify_pack(one_time("p", "499")), 10)
        self.assertEqual(paddle_billing.classify_pack(one_time("p", "999")), 25)
        self.assertEqual(paddle_billing.classify_pack(one_time("p", "1999")), 60)

    def test_other_prices_are_not_packs(self) -> None:
        self.assertIsNone(paddle_billing.classify_pack(one_time("p", "500")))
        self.assertIsNone(
            paddle_billing.classify_pack(
                one_time("p", "499", unit_price={"amount": "499", "currency_code": "EUR"})
            )
        )
        # A subscription price is never a pack, whatever it costs.
        self.assertIsNone(
            paddle_billing.classify_pack(price("p", "499", "month"))
        )
        self.assertIsNone(paddle_billing.classify_pack("junk"))

    def test_custom_data_can_name_the_credits(self) -> None:
        odd = one_time("p", "3500", custom_data={"credits": 100})
        self.assertEqual(paddle_billing.classify_pack(odd), 100)
        silly = one_time("p", "3500", custom_data={"credits": 100000})
        self.assertIsNone(paddle_billing.classify_pack(silly))


class PurchaseTests(PaddleCase):
    def test_a_paid_pack_adds_credits_once(self) -> None:
        note = self.apply(paid(user_id=self.user.id))
        self.assertIn("+10", note)
        self.assertEqual(self.balance(), 10)

        # The same payment again (new event id, same transaction).
        again = self.apply(paid(user_id=self.user.id, event_id="evt_t2"))
        self.assertIn("already credited", again)
        self.assertEqual(self.balance(), 10)

        # The very same event is a plain duplicate.
        self.assertEqual(
            self.apply(paid(user_id=self.user.id, event_id="evt_t2")), "duplicate"
        )
        self.assertEqual(self.balance(), 10)

    def test_quantity_multiplies(self) -> None:
        self.apply(paid(user_id=self.user.id, quantity=3))
        self.assertEqual(self.balance(), 30)

    def test_bigger_pack(self) -> None:
        self.apply(
            paid(user_id=self.user.id, price_obj=one_time(PACK_25, "999"))
        )
        self.assertEqual(self.balance(), 25)

    def test_unfinished_or_unknown_payments_do_nothing(self) -> None:
        self.assertIn(
            "not completed",
            self.apply(paid(user_id=self.user.id, status="billed")),
        )
        self.assertIn(
            "not a credit pack",
            self.apply(
                paid(
                    user_id=self.user.id,
                    event_id="evt_t3",
                    txn="txn_2",
                    price_obj=one_time("p", "777"),
                )
            ),
        )
        self.assertIn(
            "unknown user",
            self.apply(paid(user_id=99999, event_id="evt_t4", txn="txn_3")),
        )
        self.assertEqual(self.balance(), 0)

    def test_subscription_payments_are_not_packs(self) -> None:
        payload = paid(
            user_id=self.user.id, price_obj=price("pri_pro_month", "1299", "month")
        )
        self.assertIn("not a credit pack", self.apply(payload))
        self.assertEqual(self.balance(), 0)

    def test_bought_credits_survive_the_plan_expiry(self) -> None:
        self.apply(paid(user_id=self.user.id))  # +10 bought
        self.db.add(
            CreditEntry(
                user_id=self.user.id, delta=40, reason="plan",
                grant_key="pg:old", note="Extra monthly credits",
            )
        )
        self.db.commit()
        self.assertEqual(self.balance(), 50)

        # A new subscription month: the unused 40 plan credits expire and
        # 40 new ones arrive; the 10 that were bought are untouched.
        self.apply(
            {
                "event_id": "evt_s",
                "event_type": "subscription.created",
                "occurred_at": "2026-10-01T10:00:00Z",
                "data": {
                    "id": "sub_x", "status": "active", "customer_id": "ctm_1",
                    "custom_data": {"user_id": str(self.user.id)},
                    "started_at": "2026-10-01T10:00:00Z",
                    "items": [{"price": {"id": "pri_extra_month"}}],
                    "current_billing_period": {"ends_at": "2026-11-01T10:00:00Z"},
                    "scheduled_change": None,
                },
            }
        )
        reasons = [
            (e.reason, e.delta)
            for e in self.db.scalars(
                select(CreditEntry).where(CreditEntry.user_id == self.user.id)
                .order_by(CreditEntry.id)
            )
        ]
        self.assertIn(("expiry", -40), reasons)
        self.assertEqual(self.balance(), 50)


class RefundTests(PaddleCase):
    def setUp(self) -> None:
        super().setUp()
        self.apply(paid(user_id=self.user.id))

    def test_a_full_refund_takes_the_credits_back(self) -> None:
        note = self.apply(refund())
        self.assertIn("-10", note)
        self.assertEqual(self.balance(), 0)

        # Delivered again: nothing more is taken.
        self.assertEqual(self.apply(refund(event_id="evt_a2")), "ignored: no credit purchase to reverse")
        self.assertEqual(self.balance(), 0)

    def test_only_unspent_credits_are_taken(self) -> None:
        for number in range(7):
            self.db.add(
                CreditEntry(
                    user_id=self.user.id, delta=-1, reason="deep_scan", asset_id=number + 1
                )
            )
        self.db.commit()
        self.assertEqual(self.balance(), 3)

        self.assertIn("-3", self.apply(refund()))
        self.assertEqual(self.balance(), 0)

    def test_balance_never_goes_negative(self) -> None:
        for number in range(10):
            self.db.add(
                CreditEntry(
                    user_id=self.user.id, delta=-1, reason="deep_scan", asset_id=number + 1
                )
            )
        self.db.commit()

        self.assertIn("-0", self.apply(refund()))
        self.assertEqual(self.balance(), 0)

    def test_chargeback_also_reverses(self) -> None:
        self.assertIn("-10", self.apply(refund(action="chargeback")))
        self.assertEqual(self.balance(), 0)

    def test_pending_partial_and_other_adjustments_are_left_alone(self) -> None:
        self.assertEqual(self.apply(refund(status="pending_approval")), "ignored: not approved")
        self.assertEqual(
            self.apply(refund(event_id="evt_a3", kind="partial")),
            "ignored: partial refund",
        )
        self.assertEqual(
            self.apply(refund(event_id="evt_a4", action="credit")),
            "ignored: not a refund",
        )
        self.assertEqual(self.balance(), 10)

    def test_a_partial_label_on_a_refund_of_everything_still_takes_credits_back(
        self,
    ) -> None:
        # Paddle called a refund of the whole US$4.99 "partial".
        self.apply(
            paid(
                user_id=self.user.id,
                txn="txn_9",
                event_id="evt_t9",
                grand_total="499",
            )
        )
        self.assertEqual(self.balance(), 20)

        note = self.apply(
            refund(
                txn="txn_9",
                event_id="evt_a9",
                kind="partial",
                total="499",
                adjustment="adj_9",
            )
        )

        self.assertIn("-10", note)
        self.assertEqual(self.balance(), 10)

    def test_a_real_partial_refund_leaves_the_credits(self) -> None:
        self.apply(
            paid(
                user_id=self.user.id,
                txn="txn_8",
                event_id="evt_t8",
                grand_total="499",
            )
        )

        note = self.apply(
            refund(
                txn="txn_8",
                event_id="evt_a8",
                kind="partial",
                total="200",
                adjustment="adj_8",
            )
        )

        self.assertEqual(note, "ignored: partial refund")
        self.assertEqual(self.balance(), 20)

    def test_refund_of_a_subscription_payment_is_ignored(self) -> None:
        self.assertEqual(
            self.apply(refund(txn="txn_other", event_id="evt_a5")),
            "ignored: no credit purchase to reverse",
        )
        self.assertEqual(self.balance(), 10)


class PackListTests(PaddleCase):
    def setUp(self) -> None:
        super().setUp()
        patch = mock.patch.object(settings, "paddle_prices", {})
        patch.start()
        self.addCleanup(patch.stop)

    def test_packs_are_discovered_and_listed_small_first(self) -> None:
        response = mock.Mock()
        response.json.return_value = {
            "data": [
                one_time(PACK_25, "999"),
                one_time(PACK_10, "499"),
                price("pri_pro_month", "1299", "month"),
                one_time("pri_archived", "1999", status="archived"),
            ]
        }
        response.raise_for_status.return_value = None

        with mock.patch.object(paddle_billing.httpx, "get", return_value=response):
            packs = paddle_billing.pack_table()

        self.assertEqual(
            packs,
            [
                {"price_id": PACK_10, "credits": 10, "amount": 499},
                {"price_id": PACK_25, "credits": 25, "amount": 999},
            ],
        )


if __name__ == "__main__":
    unittest.main()
