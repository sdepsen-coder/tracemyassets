import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.crud.match_record import delete_match_records_for_user
from app.main import app
from app.models.asset import Asset
from app.models.base import Base
from app.models.match_record import MatchRecord
from app.models.user import User


class MatchDeleteTests(unittest.TestCase):
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
        self.other = User(email="b@example.com", hashed_password="x")
        self.db.add_all([self.user, self.other])
        self.db.flush()

        mine = Asset(user_id=self.user.id, title="Mine", original_url="m/o.png")
        theirs = Asset(user_id=self.other.id, title="Theirs", original_url="t/o.png")
        self.db.add_all([mine, theirs])
        self.db.flush()

        self.mine = [self._match(mine.id) for _ in range(3)]
        self.theirs = self._match(theirs.id)
        self.db.commit()

    def _match(self, asset_id: int) -> int:
        m = MatchRecord(
            asset_id=asset_id,
            source_name="s",
            similarity_percent=90.0,
            overall_signal="STRONG_VISUAL_MATCH",
        )
        self.db.add(m)
        self.db.flush()
        return m.id

    def _remaining(self) -> set[int]:
        return set(self.db.scalars(select(MatchRecord.id)))

    def test_deletes_only_own_matches(self) -> None:
        count = delete_match_records_for_user(
            self.db,
            user_id=self.user.id,
            match_ids=[self.mine[0], self.theirs, 9999],
        )
        self.db.commit()

        self.assertEqual(count, 1)
        self.assertNotIn(self.mine[0], self._remaining())
        self.assertIn(self.theirs, self._remaining())

    def test_empty_list_deletes_nothing(self) -> None:
        self.assertEqual(
            delete_match_records_for_user(
                self.db, user_id=self.user.id, match_ids=[]
            ),
            0,
        )

    def _client(self) -> TestClient:
        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.addCleanup(app.dependency_overrides.clear)
        return TestClient(app)

    def test_bulk_endpoint(self) -> None:
        client = self._client()
        response = client.post(
            "/api/v1/matches/delete",
            json={"ids": [self.mine[0], self.mine[1], self.theirs]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"deleted": 2})
        self.assertEqual(
            self.Session().scalars(select(MatchRecord.id)).all().__len__(), 2
        )

    def test_bulk_endpoint_rejects_empty_list(self) -> None:
        response = self._client().post("/api/v1/matches/delete", json={"ids": []})
        self.assertEqual(response.status_code, 422)

    def test_single_delete_and_not_found(self) -> None:
        client = self._client()

        self.assertEqual(
            client.delete(f"/api/v1/matches/{self.mine[2]}").status_code, 204
        )
        self.assertEqual(
            client.delete(f"/api/v1/matches/{self.theirs}").status_code, 404
        )
        self.assertEqual(client.delete("/api/v1/matches/9999").status_code, 404)


if __name__ == "__main__":
    unittest.main()
