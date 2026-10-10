import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.plan_limits import PLAN_LIMITS, get_plan_limits
from app.crud.monitoring import count_enabled_monitoring_for_user
from app.models.asset import Asset
from app.models.base import Base
from app.models.monitoring import MonitoringPreference
from app.models.user import User


class GetPlanLimitsTests(unittest.TestCase):
    def test_free_plan_excludes_daily(self) -> None:
        limits = get_plan_limits("Free")

        self.assertNotIn("daily", limits.allowed_scan_frequencies)
        self.assertIn("weekly", limits.allowed_scan_frequencies)

    def test_pro_plan_allows_daily(self) -> None:
        limits = get_plan_limits("Pro")

        self.assertIn("daily", limits.allowed_scan_frequencies)

    def test_unknown_plan_falls_back_to_free(self) -> None:
        limits = get_plan_limits("SomeFuturePlan")

        self.assertEqual(limits, PLAN_LIMITS["Free"])

    def test_none_falls_back_to_free(self) -> None:
        self.assertEqual(get_plan_limits(None), PLAN_LIMITS["Free"])

    def test_paid_plan_artwork_limits_match_the_pricing_page(self) -> None:
        # frontend/src/lib/plans.ts lists "Up to 40" / "Up to 100".
        self.assertEqual(get_plan_limits("Pro").max_monitored_assets, 40)
        self.assertEqual(get_plan_limits("Extra").max_monitored_assets, 100)

    def test_pro_allows_more_assets_than_free(self) -> None:
        self.assertGreater(
            get_plan_limits("Pro").max_monitored_assets,
            get_plan_limits("Free").max_monitored_assets,
        )


class CountEnabledMonitoringForUserTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        session_factory = sessionmaker(bind=engine)
        self.db = session_factory()
        self.addCleanup(self.db.close)

        self.user = User(email="artist@example.com", hashed_password="x")
        self.other_user = User(email="other@example.com", hashed_password="x")
        self.db.add_all([self.user, self.other_user])
        self.db.flush()

        self.enabled_asset = self._asset(self.user.id, "Enabled piece")
        self.disabled_asset = self._asset(self.user.id, "Disabled piece")
        self.other_users_asset = self._asset(
            self.other_user.id, "Someone else's piece"
        )

        self.db.add(
            MonitoringPreference(
                asset_id=self.enabled_asset.id,
                enabled=True,
                scan_frequency="weekly",
            )
        )
        self.db.add(
            MonitoringPreference(
                asset_id=self.disabled_asset.id,
                enabled=False,
                scan_frequency="weekly",
            )
        )
        self.db.add(
            MonitoringPreference(
                asset_id=self.other_users_asset.id,
                enabled=True,
                scan_frequency="weekly",
            )
        )
        self.db.commit()

    def _asset(self, user_id: int, title: str) -> Asset:
        asset = Asset(
            user_id=user_id,
            title=title,
            original_url=f"{title}/original.png",
        )
        self.db.add(asset)
        self.db.flush()

        return asset

    def test_counts_only_this_users_enabled_assets(self) -> None:
        count = count_enabled_monitoring_for_user(
            self.db, user_id=self.user.id
        )

        self.assertEqual(count, 1)

    def test_exclude_asset_id_omits_that_asset(self) -> None:
        count = count_enabled_monitoring_for_user(
            self.db,
            user_id=self.user.id,
            exclude_asset_id=self.enabled_asset.id,
        )

        self.assertEqual(count, 0)

    def test_other_users_assets_never_counted(self) -> None:
        count = count_enabled_monitoring_for_user(
            self.db, user_id=self.other_user.id
        )

        self.assertEqual(count, 1)


if __name__ == "__main__":
    unittest.main()
