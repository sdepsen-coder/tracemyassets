import os
import shutil
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

import numpy as np
from PIL import Image
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.models.asset import Asset
from app.models.base import Base
from app.models.monitoring import MonitoringPreference
from app.models.scan_job import ScanJob
from app.models.user import User
from app.services.asset_ingestion import DEFAULT_STORAGE_ROOT
from app.services.scheduler import is_due, run_due_scans


class IsDueTests(unittest.TestCase):
    def setUp(self) -> None:
        self.now = datetime(2026, 1, 15, tzinfo=timezone.utc)

    def _preference(self, **overrides) -> MonitoringPreference:
        defaults = dict(enabled=True, scan_frequency="weekly")
        defaults.update(overrides)

        return MonitoringPreference(asset_id=1, **defaults)

    def test_disabled_preference_is_never_due(self) -> None:
        preference = self._preference(enabled=False)

        self.assertFalse(is_due(preference, None, now=self.now))
        self.assertFalse(
            is_due(preference, self.now - timedelta(days=365), now=self.now)
        )

    def test_never_scanned_is_due(self) -> None:
        preference = self._preference()

        self.assertTrue(is_due(preference, None, now=self.now))

    def test_daily_respects_the_interval(self) -> None:
        preference = self._preference(scan_frequency="daily")

        just_under = self.now - timedelta(hours=23)
        just_over = self.now - timedelta(hours=25)

        self.assertFalse(is_due(preference, just_under, now=self.now))
        self.assertTrue(is_due(preference, just_over, now=self.now))

    def test_monthly_respects_the_interval(self) -> None:
        preference = self._preference(scan_frequency="monthly")

        just_under = self.now - timedelta(days=29)
        just_over = self.now - timedelta(days=31)

        self.assertFalse(is_due(preference, just_under, now=self.now))
        self.assertTrue(is_due(preference, just_over, now=self.now))

    def test_unknown_frequency_falls_back_to_weekly(self) -> None:
        preference = self._preference(scan_frequency="hourly")

        just_under = self.now - timedelta(days=6)
        just_over = self.now - timedelta(days=8)

        self.assertFalse(is_due(preference, just_under, now=self.now))
        self.assertTrue(is_due(preference, just_over, now=self.now))

    def test_naive_last_scan_at_is_treated_as_utc(self) -> None:
        preference = self._preference(scan_frequency="daily")
        naive_two_days_ago = datetime.now(timezone.utc).replace(
            tzinfo=None
        ) - timedelta(days=2)

        self.assertTrue(is_due(preference, naive_two_days_ago))


class RunDueScansTests(unittest.TestCase):
    def setUp(self) -> None:
        env_patch = mock.patch.dict(
            os.environ, {"WATERMARK_SECRET_HEX": "00" * 32}
        )
        env_patch.start()
        self.addCleanup(env_patch.stop)

        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        session_factory = sessionmaker(bind=engine)
        self.db = session_factory()
        self.addCleanup(self.db.close)

        user = User(email="artist@example.com", hashed_password="hashed")
        self.db.add(user)
        self.db.flush()
        self.user_id = user.id

        self.storage_dir = DEFAULT_STORAGE_ROOT / "test-scheduler-fixture"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.addCleanup(
            lambda: shutil.rmtree(self.storage_dir, ignore_errors=True)
        )

        image_path = self.storage_dir / "original.png"
        y, x = np.indices((256, 256), dtype=np.uint16)
        gradient = np.stack(
            (48 + x // 4, 64 + y // 4, 80 + (x + y) // 8), axis=-1
        ).astype(np.uint16)
        texture = np.random.default_rng(0).integers(
            0, 255, size=(256, 256, 3), dtype=np.uint16
        )
        pixels = (0.6 * gradient + 0.4 * texture).astype(np.uint8)

        with Image.fromarray(pixels) as image:
            image.save(image_path, format="PNG")

        self.original_url = "test-scheduler-fixture/original.png"

    def _make_asset(self) -> Asset:
        asset = Asset(
            user_id=self.user_id,
            title="Scheduler test asset",
            original_url=self.original_url,
        )
        self.db.add(asset)
        self.db.flush()

        return asset

    def test_enabled_never_scanned_asset_gets_scanned(self) -> None:
        asset = self._make_asset()
        preference = MonitoringPreference(
            asset_id=asset.id,
            enabled=True,
            alert_threshold_percent=80.0,
            scan_frequency="weekly",
        )
        self.db.add(preference)
        self.db.commit()

        run_due_scans(self.db)

        scan_jobs = list(self.db.scalars(select(ScanJob)))
        self.assertEqual(len(scan_jobs), 1)
        self.assertEqual(scan_jobs[0].status, "completed")

    def test_disabled_asset_is_skipped(self) -> None:
        asset = self._make_asset()
        preference = MonitoringPreference(
            asset_id=asset.id,
            enabled=False,
            alert_threshold_percent=80.0,
            scan_frequency="weekly",
        )
        self.db.add(preference)
        self.db.commit()

        run_due_scans(self.db)

        scan_jobs = list(self.db.scalars(select(ScanJob)))
        self.assertEqual(len(scan_jobs), 0)

    def test_recently_scanned_asset_is_not_scanned_again(self) -> None:
        asset = self._make_asset()
        preference = MonitoringPreference(
            asset_id=asset.id,
            enabled=True,
            alert_threshold_percent=80.0,
            scan_frequency="weekly",
        )
        self.db.add(preference)

        recent_job = ScanJob(
            asset_id=asset.id,
            provider="fake",
            status="completed",
            completed_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        self.db.add(recent_job)
        self.db.commit()

        run_due_scans(self.db)

        scan_jobs = list(self.db.scalars(select(ScanJob)))
        # Only the pre-existing job -- no new one was created.
        self.assertEqual(len(scan_jobs), 1)
        self.assertEqual(scan_jobs[0].id, recent_job.id)


if __name__ == "__main__":
    unittest.main()
