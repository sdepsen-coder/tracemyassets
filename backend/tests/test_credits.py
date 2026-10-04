import unittest
from unittest import mock

from sqlalchemy import select

import test_deep_scan_endpoint as base
from app.api.v1.endpoints import assets as assets_endpoints
from app.api.v1.endpoints.assets import router as assets_router
from app.api.v1.endpoints.credits import router as credits_router
from app.core.config import settings
from app.models.credit_entry import CreditEntry
from app.schemas.asset import ScanDiagnosticsRead
from app.services import credits


def diagnostics(asked: int, failed: int) -> ScanDiagnosticsRead:
    return ScanDiagnosticsRead(
        candidates=0,
        no_image_address=0,
        image_unreachable=0,
        not_comparable=0,
        below_threshold=0,
        page_gone=0,
        page_unrelated=0,
        recorded=0,
        providers_asked=asked,
        provider_failures=failed,
    )


class CreditServiceTests(base.EndpointTestCase):
    def test_a_new_account_gets_the_welcome_credits_once(self) -> None:
        self.assertEqual(
            credits.get_credit_summary(self.db, self.owner.id),
            credits.WELCOME_CREDITS,
        )
        self.assertEqual(
            credits.get_credit_summary(self.db, self.owner.id),
            credits.WELCOME_CREDITS,
        )

        rows = list(self.db.scalars(select(CreditEntry)))

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].reason, "welcome")

    def test_the_welcome_credits_are_three(self) -> None:
        self.assertEqual(credits.WELCOME_CREDITS, 3)

    def test_welcome_is_per_account(self) -> None:
        other = self._user("other@example.com", "Free")

        credits.get_credit_summary(self.db, self.owner.id)

        self.assertEqual(
            credits.get_credit_summary(self.db, other.id),
            credits.WELCOME_CREDITS,
        )

    def test_a_lost_race_for_the_welcome_grant_changes_nothing(self) -> None:
        # Another request gives them between our check and our insert.
        credits.ensure_welcome_grant(self.db, self.owner.id)
        self.db.commit()

        real = self.db.scalar
        calls = {"n": 0}

        def blind_first_check(*args, **kwargs):
            calls["n"] += 1

            return None if calls["n"] == 1 else real(*args, **kwargs)

        with mock.patch.object(self.db, "scalar", blind_first_check):
            credits.ensure_welcome_grant(self.db, self.owner.id)
            self.db.commit()

        self.assertEqual(
            credits.get_balance(self.db, self.owner.id),
            credits.WELCOME_CREDITS,
        )

    def test_a_charge_takes_one_credit(self) -> None:
        entry = credits.charge_for_deep_scan(
            self.db, user_id=self.owner.id, asset_id=7
        )

        self.assertEqual(entry.delta, -1)
        self.assertEqual(entry.reason, "deep_scan")
        self.assertEqual(entry.asset_id, 7)
        self.assertEqual(
            credits.get_balance(self.db, self.owner.id),
            credits.WELCOME_CREDITS - 1,
        )

    def test_the_last_credit_can_be_spent_and_no_more(self) -> None:
        for _ in range(credits.WELCOME_CREDITS):
            credits.charge_for_deep_scan(
                self.db, user_id=self.owner.id, asset_id=1
            )

        self.assertEqual(credits.get_balance(self.db, self.owner.id), 0)

        with self.assertRaises(credits.InsufficientCredits) as caught:
            credits.charge_for_deep_scan(
                self.db, user_id=self.owner.id, asset_id=1
            )

        self.assertEqual(caught.exception.balance, 0)
        self.assertEqual(credits.get_balance(self.db, self.owner.id), 0)

    def test_a_refund_gives_the_credit_back_once(self) -> None:
        charge = credits.charge_for_deep_scan(
            self.db, user_id=self.owner.id, asset_id=1
        )

        self.assertTrue(credits.refund_charge(self.db, charge))
        self.assertFalse(credits.refund_charge(self.db, charge))
        self.assertFalse(credits.refund_charge(self.db, charge))

        self.assertEqual(
            credits.get_balance(self.db, self.owner.id),
            credits.WELCOME_CREDITS,
        )

    def test_a_grant_adds_credits_and_must_be_positive(self) -> None:
        credits.grant_credits(
            self.db, user_id=self.owner.id, amount=5, note="batch two"
        )

        self.assertEqual(
            credits.get_balance(self.db, self.owner.id), 5
        )

        for bad in (0, -3):
            with self.assertRaises(ValueError):
                credits.grant_credits(
                    self.db, user_id=self.owner.id, amount=bad
                )

    def test_nobody_else_is_affected(self) -> None:
        other = self._user("other@example.com", "Free")

        credits.charge_for_deep_scan(
            self.db, user_id=self.owner.id, asset_id=1
        )

        self.assertEqual(
            credits.get_credit_summary(self.db, other.id),
            credits.WELCOME_CREDITS,
        )

    def test_the_charge_locks_the_users_row_while_it_checks_the_balance(
        self,
    ) -> None:
        """
        What stops two scans started at once from both taking the last
        credit is a row lock on the user (SELECT ... FOR UPDATE), which
        PostgreSQL honours and SQLite ignores. A real race cannot be run
        here, so this checks that the lock is asked for, and that it is
        asked for before the balance is read.
        """
        seen: list[str] = []
        real_execute = self.db.execute
        real_scalar = self.db.scalar

        def execute(statement, *args, **kwargs):
            seen.append(
                "lock"
                if getattr(statement, "_for_update_arg", None) is not None
                else "other"
            )

            return real_execute(statement, *args, **kwargs)

        def scalar(statement, *args, **kwargs):
            seen.append("read")

            return real_scalar(statement, *args, **kwargs)

        with mock.patch.object(self.db, "execute", execute), mock.patch.object(
            self.db, "scalar", scalar
        ):
            credits.charge_for_deep_scan(
                self.db, user_id=self.owner.id, asset_id=1
            )

        self.assertIn("lock", seen)
        self.assertLess(seen.index("lock"), seen.index("read"))


class CreditsEndpointTests(base.EndpointTestCase):
    def test_it_reports_balance_cost_and_history(self) -> None:
        client = self._client(credits_router)

        response = client.get("/api/v1/credits")

        self.assertEqual(response.status_code, 200)

        body = response.json()

        self.assertEqual(body["balance"], credits.WELCOME_CREDITS)
        self.assertEqual(body["deep_scan_cost"], 1)
        self.assertEqual(
            [(e["delta"], e["reason"]) for e in body["recent"]],
            [(credits.WELCOME_CREDITS, "welcome")],
        )

    def test_it_never_exposes_admin_notes(self) -> None:
        credits.grant_credits(
            self.db, user_id=self.owner.id, amount=2, note="internal remark"
        )
        client = self._client(credits_router)

        response = client.get("/api/v1/credits")

        self.assertNotIn("internal remark", response.text)
        self.assertNotIn("note", response.json()["recent"][0])


class DeepScanCreditsTests(base.DeepScanEndpointTests):
    """Runs on top of the deep scan endpoint set-up (same fakes)."""

    # The inherited tests would run again here; keep only our own.
    test_an_internal_account_can_run_one = None
    test_it_runs_only_the_deep_scan_providers = None
    test_every_plan_may_run_one_now_that_credits_gate_it = None
    test_a_plan_with_deep_scan_switched_off_is_refused = None
    test_someone_elses_artwork_is_not_found = None
    test_an_unconfigured_provider_is_a_clean_503 = None
    test_a_spent_daily_allowance_is_a_429_before_any_scan = None
    test_a_spent_monthly_allowance_is_a_429 = None
    test_other_providers_spending_does_not_count = None

    def _scan(self, asset):
        return self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

    def _balance(self) -> int:
        self.db.expire_all()

        return credits.get_balance(self.db, self.owner.id)

    def test_a_deep_scan_costs_one_credit_and_reports_what_is_left(self) -> None:
        asset = self._asset()

        response = self._scan(asset)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["credits_remaining"], credits.WELCOME_CREDITS - 1
        )
        self.assertFalse(response.json()["credit_refunded"])
        self.assertEqual(self._balance(), credits.WELCOME_CREDITS - 1)

    def test_with_no_credits_it_is_a_402_and_nothing_runs(self) -> None:
        asset = self._asset()

        for _ in range(credits.WELCOME_CREDITS):
            self.assertEqual(self._scan(asset).status_code, 200)

        self.execute.reset_mock()

        response = self._scan(asset)

        self.assertEqual(response.status_code, 402)
        self.assertIn("no deep scan credits", response.json()["detail"])
        self.execute.assert_not_called()
        self.assertEqual(self._balance(), 0)

    def test_a_scan_where_every_provider_failed_is_refunded(self) -> None:
        asset = self._asset()
        failed = base.scan_result(asset.id)
        failed.diagnostics = diagnostics(asked=1, failed=1)
        self.execute.side_effect = lambda *a, **k: failed

        response = self._scan(asset)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["credit_refunded"])
        self.assertEqual(
            response.json()["credits_remaining"], credits.WELCOME_CREDITS
        )
        self.assertEqual(self._balance(), credits.WELCOME_CREDITS)

    def test_a_scan_where_some_provider_worked_is_not_refunded(self) -> None:
        asset = self._asset()
        partly = base.scan_result(asset.id)
        partly.diagnostics = diagnostics(asked=2, failed=1)
        self.execute.side_effect = lambda *a, **k: partly

        response = self._scan(asset)

        self.assertFalse(response.json()["credit_refunded"])
        self.assertEqual(self._balance(), credits.WELCOME_CREDITS - 1)

    def test_a_scan_that_crashes_is_refunded(self) -> None:
        asset = self._asset()
        self.execute.side_effect = RuntimeError("boom")
        client = self._client(assets_router)
        client = type(client)(client.app, raise_server_exceptions=False)

        response = client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(self._balance(), credits.WELCOME_CREDITS)

    def test_refusals_before_the_charge_cost_nothing(self) -> None:
        asset = self._asset()

        with mock.patch.object(settings, "serpapi_daily_limit", 0):
            self.assertEqual(self._scan(asset).status_code, 429)

        self.get_deep.side_effect = RuntimeError("not configured")
        self.assertEqual(self._scan(asset).status_code, 503)

        self.db.expire_all()

        charges = list(
            self.db.scalars(
                select(CreditEntry).where(CreditEntry.reason == "deep_scan")
            )
        )

        self.assertEqual(charges, [])

    def test_someone_elses_credits_are_not_used(self) -> None:
        asset = self._asset()
        other = self._user("other@example.com", "Free")
        credits.get_credit_summary(self.db, other.id)

        self._scan(asset)

        self.db.expire_all()

        self.assertEqual(
            credits.get_balance(self.db, other.id), credits.WELCOME_CREDITS
        )


if __name__ == "__main__":
    unittest.main()
