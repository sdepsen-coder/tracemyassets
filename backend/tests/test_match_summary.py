import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.crud.match_record import count_match_records_by_status
from app.models.asset import Asset
from app.models.base import Base
from app.models.match_record import MatchRecord
from app.models.user import User


class CountMatchRecordsByStatusTests(unittest.TestCase):
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

        self.asset = Asset(
            user_id=self.user.id,
            title="Piece",
            original_url="piece/original.png",
        )
        self.other_asset = Asset(
            user_id=self.other_user.id,
            title="Someone else's piece",
            original_url="other/original.png",
        )
        self.db.add_all([self.asset, self.other_asset])
        self.db.flush()

    def _match(self, asset_id: int, review_status: str) -> MatchRecord:
        match = MatchRecord(
            asset_id=asset_id,
            source_name="Demo source",
            similarity_percent=90.0,
            overall_signal="STRONG_VISUAL_MATCH",
            review_status=review_status,
        )
        self.db.add(match)

        return match

    def test_counts_grouped_by_status_for_this_user_only(self) -> None:
        self._match(self.asset.id, "new")
        self._match(self.asset.id, "new")
        self._match(self.asset.id, "dismissed")
        self._match(self.other_asset.id, "new")
        self.db.commit()

        counts = count_match_records_by_status(
            self.db, user_id=self.user.id
        )

        self.assertEqual(counts, {"new": 2, "dismissed": 1})

    def test_no_matches_returns_empty_dict(self) -> None:
        counts = count_match_records_by_status(
            self.db, user_id=self.user.id
        )

        self.assertEqual(counts, {})


if __name__ == "__main__":
    unittest.main()
