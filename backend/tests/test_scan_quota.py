import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

import test_deep_scan_endpoint as base
from app.api.v1.endpoints import assets as assets_endpoints
from app.api.v1.endpoints.assets import router as assets_router
from app.api.v1.endpoints.usage import router as usage_router
from app.core.config import settings
from app.core.plan_limits import PLAN_LIMITS, get_plan_limits
from app.models.user import User
from app.models.user_event import UserEvent
from app.services import scan_quota, user_events


class PlanTests(unittest.TestCase):
    def test_extra_sits_above_pro(self) -> None:
        free, pro, extra = (get_plan_limits(n) for n in ("Free", "Pro", "Extra"))

        self.assertIn("Extra", PLAN_LIMITS)
        self.assertEqual(free.manual_scans_per_month, 5)
        self.assertLess(pro.manual_scans_per_month, extra.manual_scans_per_month)
        self.assertLess(pro.max_monitored_assets, extra.max_monitored_assets)
        self.assertTrue(extra.reveals_match_source)
        self.assertIsNone(get_plan_limits("Internal").manual_scans_per_month)


class ManualScanQuotaTests(base.EndpointTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.client = self._client(assets_router, usage_router)

        for patcher in (
            mock.patch.object(
                assets_endpoints,
                "get_configured_providers",
                return_value=[object()],
            ),
            mock.patch.object(
                assets_endpoints,
                "_execute_scan",
                side_effect=lambda db, *, asset, **kw: base.scan_result(asset.id),
            ),
            mock.patch.object(
                assets_endpoints,
                "get_deep_scan_providers",
                return_value=[object()],
            ),
            mock.patch.object(settings, "serpapi_daily_limit", 50),
            mock.patch.object(settings, "serpapi_monthly_limit", 500),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

        self.free = self._user("free@example.com", "Free")
        self.current_user = self.free
        self.asset = self._asset(user=self.free)

    def scan(self):
        return self.client.post(f"/api/v1/assets/{self.asset.id}/scan")

    def usage(self) -> dict:
        return self.client.get("/api/v1/usage").json()

    def test_a_free_account_gets_five_manual_scans_a_month(self) -> None:
        self.assertEqual(self.usage()["manual_scans"]["remaining"], 5)

        for _ in range(5):
            self.assertEqual(self.scan().status_code, 200)

        usage = self.usage()["manual_scans"]
        self.assertEqual((usage["used"], usage["limit"], usage["remaining"]), (5, 5, 0))

        blocked = self.scan()
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("5 Standard scans", blocked.json()["detail"])
        self.assertIn("reset on", blocked.json()["detail"])

    def test_deep_scans_and_scheduled_scans_do_not_use_the_allowance(self) -> None:
        for _ in range(5):
            self.scan()

        deep = self.client.post(f"/api/v1/assets/{self.asset.id}/deep-scan")
        self.assertEqual(deep.status_code, 200, deep.text)
        self.assertEqual(self.usage()["manual_scans"]["used"], 5)

    def test_a_scan_that_fails_is_not_counted(self) -> None:
        with mock.patch.object(
            assets_endpoints,
            "_execute_scan",
            side_effect=assets_endpoints.HTTPException(500, "boom"),
        ):
            self.assertEqual(self.scan().status_code, 500)

        self.assertEqual(self.usage()["manual_scans"]["used"], 0)

    def test_last_months_scans_do_not_count(self) -> None:
        self.db.add(
            UserEvent(
                event_type=user_events.SCAN,
                user_id=self.free.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=45),
            )
        )
        self.db.commit()

        self.assertEqual(self.usage()["manual_scans"]["used"], 0)

    def test_other_accounts_have_their_own_allowance(self) -> None:
        for _ in range(5):
            self.scan()

        pro = self._user("pro@example.com", "Pro")
        self.current_user = pro
        asset = self._asset(user=pro)

        self.assertEqual(self.usage()["plan_type"], "Pro")
        self.assertEqual(self.usage()["manual_scans"]["limit"], 30)
        self.assertEqual(
            self.client.post(f"/api/v1/assets/{asset.id}/scan").status_code, 200
        )

        self.current_user = self.owner  # Internal: no limit
        usage = self.usage()["manual_scans"]
        self.assertIsNone(usage["limit"])
        self.assertIsNone(usage["remaining"])


class MonthWindowTests(unittest.TestCase):
    def test_the_month_resets_on_the_first(self) -> None:
        now = datetime(2026, 12, 20, 15, 0, tzinfo=timezone.utc)

        self.assertEqual(
            scan_quota.month_start(now),
            datetime(2026, 12, 1, tzinfo=timezone.utc),
        )
        self.assertEqual(scan_quota.next_month_start(now).date().isoformat(), "2027-01-01")


class DormantTests(base.EndpointTestCase):
    def activity(self, user: User, days_ago: int, kind: str = user_events.LOGIN):
        self.db.add(
            UserEvent(
                event_type=kind,
                user_id=user.id,
                created_at=datetime.now(timezone.utc) - timedelta(days=days_ago),
            )
        )
        self.db.commit()

    def aged(self, user: User, days: int) -> User:
        user.created_at = datetime.now(timezone.utc) - timedelta(days=days)
        self.db.commit()

        return user

    def test_free_account_goes_dormant_after_sixty_quiet_days(self) -> None:
        free = self.aged(self._user("a@example.com", "Free"), 200)

        self.activity(free, 59)
        self.assertFalse(scan_quota.is_dormant(self.db, free))

        self.db.query(UserEvent).delete()
        self.activity(free, 61)
        self.assertTrue(scan_quota.is_dormant(self.db, free))

        # Any new activity wakes it up again.
        self.activity(free, 1, user_events.SESSION_RENEWED)
        self.assertFalse(scan_quota.is_dormant(self.db, free))

    def test_without_any_event_the_sign_up_date_counts(self) -> None:
        self.assertTrue(
            scan_quota.is_dormant(self.db, self.aged(self._user("b@example.com", "Free"), 90))
        )
        self.assertFalse(
            scan_quota.is_dormant(self.db, self.aged(self._user("c@example.com", "Free"), 10))
        )

    def test_paying_and_internal_accounts_never_go_dormant(self) -> None:
        for plan in ("Pro", "Extra", "Internal"):
            user = self.aged(self._user(f"{plan}@example.com", plan), 400)
            self.assertFalse(scan_quota.is_dormant(self.db, user), plan)

    def test_it_can_be_switched_off(self) -> None:
        user = self.aged(self._user("d@example.com", "Free"), 400)

        with mock.patch.object(settings, "free_dormant_days", 0):
            self.assertFalse(scan_quota.is_dormant(self.db, user))

    def test_things_done_to_the_account_are_not_activity(self) -> None:
        user = self.aged(self._user("e@example.com", "Free"), 400)
        self.activity(user, 1, user_events.ADMIN_ACTION)
        self.activity(user, 1, user_events.LOGIN_FAILED)

        self.assertTrue(scan_quota.is_dormant(self.db, user))


if __name__ == "__main__":
    unittest.main()
