import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.crud.match_record import count_match_records_by_status
from app.models.asset import Asset
from app.models.base import Base
from app.models.match_record import MatchRecord
from app.models.user import User


class MatchSummaryCardTests(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()
        self.addCleanup(self.db.close)

        self.user = User(email="a@example.com", hashed_password="x")
        self.other = User(email="b@example.com", hashed_password="x")
        self.db.add_all([self.user, self.other])
        self.db.flush()

        self.a1 = Asset(user_id=self.user.id, title="A1", original_url="1")
        self.a2 = Asset(user_id=self.user.id, title="A2", original_url="2")
        theirs = Asset(user_id=self.other.id, title="T", original_url="3")
        self.db.add_all([self.a1, self.a2, theirs])
        self.db.flush()
        self.theirs = theirs

    def _add(self, asset, status="new", url=None, image_hash=None) -> None:
        self.db.add(
            MatchRecord(
                asset_id=asset.id,
                source_name="s",
                similarity_percent=90.0,
                overall_signal="STRONG_VISUAL_MATCH",
                review_status=status,
                candidate_image_url=url,
                candidate_image_hash=image_hash,
            )
        )
        self.db.flush()

    def count(self, reveals_source: bool = True) -> dict[str, int]:
        return count_match_records_by_status(
            self.db, user_id=self.user.id, reveals_source=reveals_source
        )

    def test_same_picture_on_several_pages_is_one_card(self) -> None:
        for _ in range(7):
            self._add(self.a1, url="https://img/x.jpg")

        self.assertEqual(self.count(), {"new": 1})

    def test_different_pictures_artworks_and_statuses_stay_apart(self) -> None:
        self._add(self.a1, url="https://img/x.jpg")
        self._add(self.a1, url="https://img/y.jpg")
        self._add(self.a2, url="https://img/x.jpg")
        self._add(self.a1, status="archived", url="https://img/x.jpg")

        self.assertEqual(self.count(), {"new": 3, "archived": 1})

    def test_hidden_sources_group_by_hash_only(self) -> None:
        # The page cannot see addresses on such a plan, so two addresses
        # with the same hash are one card there, and so here.
        self._add(self.a1, url="https://img/x.jpg", image_hash="same")
        self._add(self.a1, url="https://img/y.jpg", image_hash="same")

        self.assertEqual(self.count(reveals_source=True), {"new": 2})
        self.assertEqual(self.count(reveals_source=False), {"new": 1})

    def test_hash_groups_when_there_is_no_address(self) -> None:
        self._add(self.a1, image_hash="abc")
        self._add(self.a1, image_hash="abc")

        self.assertEqual(self.count(), {"new": 1})

    def test_matches_without_image_info_stand_alone(self) -> None:
        self._add(self.a1)
        self._add(self.a1)

        self.assertEqual(self.count(), {"new": 2})

    def test_other_users_matches_are_not_counted(self) -> None:
        self._add(self.theirs, url="https://img/x.jpg")

        self.assertEqual(self.count(), {})


if __name__ == "__main__":
    unittest.main()
