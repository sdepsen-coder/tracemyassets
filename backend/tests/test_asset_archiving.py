import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.crud.asset import get_assets, set_asset_archived
from app.crud.monitoring import get_monitoring_preference
from app.models.asset import Asset
from app.models.base import Base
from app.models.monitoring import MonitoringPreference
from app.models.user import User


class AssetArchivingTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        session_factory = sessionmaker(bind=engine)
        self.db = session_factory()
        self.addCleanup(self.db.close)

        self.user = User(email="artist@example.com", hashed_password="x")
        self.db.add(self.user)
        self.db.flush()

        self.active_asset = self._asset("Active piece")
        self.archived_asset = self._asset("Already archived piece")
        self.archived_asset.status = "archived"
        self.db.commit()

    def _asset(self, title: str) -> Asset:
        asset = Asset(
            user_id=self.user.id,
            title=title,
            original_url=f"{title}/original.png",
        )
        self.db.add(asset)
        self.db.flush()

        return asset

    def test_default_listing_excludes_archived(self) -> None:
        assets = get_assets(self.db, user_id=self.user.id)

        self.assertEqual([a.id for a in assets], [self.active_asset.id])

    def test_archived_filter_returns_only_archived(self) -> None:
        assets = get_assets(
            self.db, user_id=self.user.id, status="archived"
        )

        self.assertEqual([a.id for a in assets], [self.archived_asset.id])

    def test_status_none_returns_everything(self) -> None:
        assets = get_assets(self.db, user_id=self.user.id, status=None)

        self.assertEqual(len(assets), 2)

    def test_archiving_turns_off_enabled_monitoring(self) -> None:
        preference = MonitoringPreference(
            asset_id=self.active_asset.id,
            enabled=True,
            scan_frequency="weekly",
        )
        self.db.add(preference)
        self.db.commit()

        set_asset_archived(self.db, asset=self.active_asset, archived=True)
        self.db.commit()

        refreshed = get_monitoring_preference(
            self.db, asset_id=self.active_asset.id
        )
        self.assertFalse(refreshed.enabled)
        self.assertEqual(self.active_asset.status, "archived")

    def test_restoring_does_not_auto_enable_monitoring(self) -> None:
        preference = MonitoringPreference(
            asset_id=self.archived_asset.id,
            enabled=False,
            scan_frequency="weekly",
        )
        self.db.add(preference)
        self.db.commit()

        set_asset_archived(
            self.db, asset=self.archived_asset, archived=False
        )
        self.db.commit()

        refreshed = get_monitoring_preference(
            self.db, asset_id=self.archived_asset.id
        )
        self.assertFalse(refreshed.enabled)
        self.assertEqual(self.archived_asset.status, "active")

    def test_archiving_with_no_monitoring_preference_does_not_error(
        self,
    ) -> None:
        # active_asset has no MonitoringPreference row at all yet.
        set_asset_archived(self.db, asset=self.active_asset, archived=True)
        self.db.commit()

        self.assertEqual(self.active_asset.status, "archived")


if __name__ == "__main__":
    unittest.main()
