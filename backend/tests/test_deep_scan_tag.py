import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.main import app
from app.models.asset import Asset
from app.models.base import Base
from app.models.match_record import MatchRecord
from app.models.scan_job import ScanJob
from app.models.user import User
from app.services.match_presentation import (
    deep_scan_job_ids,
    is_deep_scan_provider,
)


class DeepScanTagTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine)
        self.db = self.Session()
        self.addCleanup(self.db.close)

        self.user = User(email="a@example.com", hashed_password="x")
        self.db.add(self.user)
        self.db.flush()

        asset = Asset(user_id=self.user.id, title="A", original_url="a/o.png")
        self.db.add(asset)
        self.db.flush()

        self.deep_job = ScanJob(
            asset_id=asset.id, provider="serpapi-lens", status="completed"
        )
        self.std_job = ScanJob(
            asset_id=asset.id,
            provider="google-vision,rainforest-amazon",
            status="completed",
        )
        self.db.add_all([self.deep_job, self.std_job])
        self.db.flush()

        self.deep_match = self._match(asset.id, self.deep_job.id)
        self.std_match = self._match(asset.id, self.std_job.id)
        self.no_job_match = self._match(asset.id, None)
        self.db.commit()

        def override_db():
            yield self.db

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)

    def _match(self, asset_id: int, job_id: int | None) -> int:
        m = MatchRecord(
            asset_id=asset_id,
            scan_job_id=job_id,
            source_name="s",
            similarity_percent=90.0,
            overall_signal="STRONG_VISUAL_MATCH",
        )
        self.db.add(m)
        self.db.flush()
        return m.id

    def test_provider_helper(self) -> None:
        self.assertTrue(is_deep_scan_provider("serpapi-lens"))
        self.assertTrue(is_deep_scan_provider("google-vision,serpapi-lens"))
        self.assertFalse(is_deep_scan_provider("google-vision"))
        self.assertFalse(is_deep_scan_provider(None))
        self.assertFalse(is_deep_scan_provider(""))

    def test_job_ids(self) -> None:
        found = deep_scan_job_ids(
            self.db, [self.deep_job.id, self.std_job.id, None]
        )
        self.assertEqual(found, {self.deep_job.id})
        self.assertEqual(deep_scan_job_ids(self.db, []), set())

    def test_matches_list_flags_only_deep_scan_finds(self) -> None:
        response = self.client.get("/api/v1/matches")
        self.assertEqual(response.status_code, 200)
        flags = {m["id"]: m["found_by_deep_scan"] for m in response.json()}

        self.assertTrue(flags[self.deep_match])
        self.assertFalse(flags[self.std_match])
        self.assertFalse(flags[self.no_job_match])


if __name__ == "__main__":
    unittest.main()
