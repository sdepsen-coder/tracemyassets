import unittest

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.asset import Asset
from app.models.match_record import MatchRecord
from app.models.user import User
from app.crud.match_record import record_or_touch_match


class RecordOrTouchMatchTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        session_factory = sessionmaker(bind=engine)
        self.db = session_factory()
        self.addCleanup(self.db.close)

        user = User(
            email="artist@example.com",
            hashed_password="hashed",
        )
        self.db.add(user)
        self.db.flush()

        asset = Asset(
            user_id=user.id,
            title="Botanical Dreams",
            original_url="1/original.png",
        )
        self.db.add(asset)
        self.db.flush()

        self.asset_id = asset.id

    def _record(self, **overrides):
        defaults = dict(
            asset_id=self.asset_id,
            scan_job_id=None,
            source_name="Demo source",
            source_url="https://example.com/source",
            candidate_image_url="https://example.com/image.jpg",
            candidate_page_url="https://example.com/page",
            candidate_image_hash="abc123",
            similarity_percent=92.0,
            watermark_verified=True,
            watermark_matches_reference=True,
            overall_signal="WATERMARK_VERIFIED",
        )
        defaults.update(overrides)

        return record_or_touch_match(self.db, **defaults)

    def test_same_page_and_hash_updates_instead_of_duplicating(self) -> None:
        first = self._record(scan_job_id=1)
        second = self._record(scan_job_id=2, similarity_percent=95.0)

        self.assertEqual(first.id, second.id)
        self.assertEqual(second.scan_job_id, 2)
        self.assertEqual(second.similarity_percent, 95.0)

        all_matches = list(
            self.db.scalars(select(MatchRecord))
        )
        self.assertEqual(len(all_matches), 1)

    def test_different_page_creates_a_second_record(self) -> None:
        first = self._record(
            candidate_page_url="https://example.com/page-a"
        )
        second = self._record(
            candidate_page_url="https://example.com/page-b"
        )

        self.assertNotEqual(first.id, second.id)

        all_matches = list(
            self.db.scalars(select(MatchRecord))
        )
        self.assertEqual(len(all_matches), 2)

    def test_dismissed_status_is_not_reset_when_seen_again(self) -> None:
        first = self._record()
        first.review_status = "dismissed"
        self.db.add(first)
        self.db.flush()

        second = self._record(similarity_percent=93.0)

        self.assertEqual(first.id, second.id)
        self.assertEqual(second.review_status, "dismissed")

    def test_missing_page_url_never_dedupes(self) -> None:
        first = self._record(candidate_page_url=None)
        second = self._record(candidate_page_url=None)

        self.assertNotEqual(first.id, second.id)


if __name__ == "__main__":
    unittest.main()
