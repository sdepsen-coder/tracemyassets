import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.crud.asset import delete_asset
from app.models.asset import Asset
from app.models.base import Base
from app.models.match_record import MatchRecord
from app.models.monitoring import MonitoringPreference
from app.models.scan_job import ScanJob
from app.models.user import User


class DeleteAssetTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        session_factory = sessionmaker(bind=engine)
        self.db = session_factory()
        self.addCleanup(self.db.close)

        self.user = User(email="artist@example.com", hashed_password="x")
        self.db.add(self.user)
        self.db.flush()

        self.target = self._asset("Piece to delete")
        self.other = self._asset("Unrelated piece")
        self.db.commit()

    def _asset(self, title: str) -> Asset:
        asset = Asset(
            user_id=self.user.id,
            title=title,
            original_url=f"{title}/original.png",
            status="archived",
        )
        self.db.add(asset)
        self.db.flush()

        return asset

    def _give_target_full_history(self) -> None:
        """
        Attach one row of each dependent type to self.target, plus one
        of each to self.other -- so a test can check that deleting the
        target leaves the other asset's rows untouched.
        """
        for asset in (self.target, self.other):
            scan_job = ScanJob(asset_id=asset.id, provider="fake")
            self.db.add(scan_job)
            self.db.flush()

            self.db.add(
                MonitoringPreference(
                    asset_id=asset.id,
                    enabled=True,
                    scan_frequency="weekly",
                )
            )

            self.db.add(
                MatchRecord(
                    asset_id=asset.id,
                    scan_job_id=scan_job.id,
                    source_name="Demo source",
                    similarity_percent=91.0,
                )
            )

        self.db.commit()

    def test_delete_removes_the_asset_row(self) -> None:
        delete_asset(self.db, asset=self.target)
        self.db.commit()

        remaining = list(self.db.scalars(select(Asset)))
        self.assertEqual([a.id for a in remaining], [self.other.id])

    def test_delete_removes_dependent_rows_for_that_asset_only(self) -> None:
        self._give_target_full_history()

        delete_asset(self.db, asset=self.target)
        self.db.commit()

        remaining_matches = list(self.db.scalars(select(MatchRecord)))
        remaining_scan_jobs = list(self.db.scalars(select(ScanJob)))
        remaining_preferences = list(
            self.db.scalars(select(MonitoringPreference))
        )

        self.assertEqual(
            [m.asset_id for m in remaining_matches], [self.other.id]
        )
        self.assertEqual(
            [s.asset_id for s in remaining_scan_jobs], [self.other.id]
        )
        self.assertEqual(
            [p.asset_id for p in remaining_preferences], [self.other.id]
        )

    def test_delete_with_no_dependent_rows_does_not_error(self) -> None:
        # self.target has no scan jobs, matches, or monitoring
        # preference -- this is the common case for a never-monitored
        # asset, and must not raise.
        delete_asset(self.db, asset=self.target)
        self.db.commit()

        remaining = list(self.db.scalars(select(Asset)))
        self.assertEqual([a.id for a in remaining], [self.other.id])


if __name__ == "__main__":
    unittest.main()
