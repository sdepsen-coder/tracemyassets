import unittest
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.api.v1.endpoints.feedback import router as feedback_router
from app.api.v1.endpoints.matches import router as matches_router
from app.crud.asset import delete_asset
from app.crud.feedback import (
    MAX_FEEDBACK_ENTRIES_PER_DAY,
    clear_match_verdict,
    count_feedback_since,
    create_feedback,
    get_verdicts_for_matches,
    source_kind_for,
    upsert_match_verdict,
)
from app.models.asset import Asset
from app.models.base import Base
from app.models.feedback import FeedbackEntry
from app.models.match_record import MatchRecord
from app.models.user import User
from app.schemas.feedback import FeedbackCreate


def make_session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    return sessionmaker(bind=engine)


class FeedbackDataTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.session_factory = make_session_factory()
        self.db = self.session_factory()
        self.addCleanup(self.db.close)

        self.user = self._user("artist@example.com")
        self.other_user = self._user("other@example.com")
        self.asset = self._asset(self.user, "Piece")
        self.match = self._match(
            self.asset, source_name="Etsy: listing", similarity_percent=91.0
        )
        self.db.commit()

    def _user(self, email: str) -> User:
        user = User(email=email, hashed_password="x")
        self.db.add(user)
        self.db.flush()

        return user

    def _asset(self, user: User, title: str) -> Asset:
        asset = Asset(
            user_id=user.id,
            title=title,
            original_url=f"{title}/original.png",
            status="active",
        )
        self.db.add(asset)
        self.db.flush()

        return asset

    def _match(
        self,
        asset: Asset,
        *,
        source_name: str = "Some page",
        similarity_percent: float = 80.0,
    ) -> MatchRecord:
        match = MatchRecord(
            asset_id=asset.id,
            source_name=source_name,
            source_url="https://example.com/page",
            candidate_page_url="https://example.com/page",
            similarity_percent=similarity_percent,
            overall_signal="STRONG_VISUAL_MATCH",
        )
        self.db.add(match)
        self.db.flush()

        return match


class SourceKindTests(unittest.TestCase):
    def test_marketplace_labels_are_recognised(self) -> None:
        self.assertEqual(
            source_kind_for("Amazon (amazon.co.uk): Some mug"), "amazon"
        )
        self.assertEqual(source_kind_for("Etsy: Frog print"), "etsy")
        self.assertEqual(source_kind_for("  etsy listing"), "etsy")

    def test_everything_else_is_web(self) -> None:
        self.assertEqual(source_kind_for("My blog post"), "web")
        self.assertEqual(source_kind_for(None), "web")
        self.assertEqual(source_kind_for(""), "web")


class MatchVerdictTests(FeedbackDataTestCase):
    def test_first_verdict_creates_one_row_with_a_snapshot(self) -> None:
        entry = upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="useful",
        )
        self.db.commit()

        self.assertEqual(entry.verdict, "useful")
        self.assertEqual(entry.match_id, self.match.id)
        self.assertEqual(entry.similarity_percent, 91.0)
        self.assertEqual(entry.overall_signal, "STRONG_VISUAL_MATCH")
        self.assertEqual(entry.source_kind, "etsy")

    def test_changing_the_verdict_updates_the_same_row(self) -> None:
        upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="useful",
        )
        upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="unrelated",
        )
        self.db.commit()

        rows = list(self.db.scalars(select(FeedbackEntry)))

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].verdict, "unrelated")

    def test_the_snapshot_is_not_an_address(self) -> None:
        entry = upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="useful",
        )

        stored = " ".join(
            str(value)
            for value in (
                entry.message,
                entry.answers_json,
                entry.source_kind,
                entry.overall_signal,
            )
            if value
        )

        self.assertNotIn("example.com", stored)

    def test_verdicts_are_per_user(self) -> None:
        upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="useful",
        )
        upsert_match_verdict(
            self.db,
            user_id=self.other_user.id,
            match_record=self.match,
            verdict="different",
        )
        self.db.commit()

        mine = get_verdicts_for_matches(
            self.db, user_id=self.user.id, match_ids=[self.match.id]
        )
        theirs = get_verdicts_for_matches(
            self.db, user_id=self.other_user.id, match_ids=[self.match.id]
        )

        self.assertEqual(mine, {self.match.id: "useful"})
        self.assertEqual(theirs, {self.match.id: "different"})

    def test_lookup_with_no_ids_is_empty(self) -> None:
        self.assertEqual(
            get_verdicts_for_matches(
                self.db, user_id=self.user.id, match_ids=[]
            ),
            {},
        )

    def test_clearing_removes_only_that_verdict(self) -> None:
        second = self._match(self.asset)
        upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="useful",
        )
        upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=second,
            verdict="unrelated",
        )
        self.db.commit()

        self.assertTrue(
            clear_match_verdict(
                self.db, user_id=self.user.id, match_id=self.match.id
            )
        )
        self.assertFalse(
            clear_match_verdict(
                self.db, user_id=self.user.id, match_id=self.match.id
            )
        )

        remaining = get_verdicts_for_matches(
            self.db,
            user_id=self.user.id,
            match_ids=[self.match.id, second.id],
        )

        self.assertEqual(remaining, {second.id: "unrelated"})

    def test_a_verdict_survives_deleting_the_artwork(self) -> None:
        upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="unrelated",
        )
        self.db.commit()

        delete_asset(self.db, asset=self.asset)
        self.db.commit()

        self.assertEqual(list(self.db.scalars(select(MatchRecord))), [])

        rows = list(self.db.scalars(select(FeedbackEntry)))

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].verdict, "unrelated")
        self.assertEqual(rows[0].similarity_percent, 91.0)


class GeneralFeedbackTests(FeedbackDataTestCase):
    def test_answers_are_stored_as_json_and_message_is_trimmed(self) -> None:
        entry = create_feedback(
            self.db,
            user_id=self.user.id,
            kind="beta_survey",
            message="  hello  ",
            answers={"would_pay": "maybe 5 pounds"},
        )

        self.assertEqual(entry.message, "hello")
        self.assertEqual(entry.answers_json, '{"would_pay": "maybe 5 pounds"}')

    def test_blank_message_is_stored_as_none(self) -> None:
        entry = create_feedback(
            self.db,
            user_id=self.user.id,
            kind="general",
            message="   ",
            answers=None,
        )

        self.assertIsNone(entry.message)
        self.assertIsNone(entry.answers_json)

    def test_daily_count_ignores_match_verdicts_and_old_entries(self) -> None:
        upsert_match_verdict(
            self.db,
            user_id=self.user.id,
            match_record=self.match,
            verdict="useful",
        )
        create_feedback(
            self.db,
            user_id=self.user.id,
            kind="general",
            message="recent",
            answers=None,
        )
        old = create_feedback(
            self.db,
            user_id=self.user.id,
            kind="general",
            message="old",
            answers=None,
        )
        old.created_at = datetime.now(timezone.utc) - timedelta(days=3)
        self.db.commit()

        count = count_feedback_since(
            self.db,
            user_id=self.user.id,
            since=datetime.now(timezone.utc) - timedelta(days=1),
        )

        self.assertEqual(count, 1)


class FeedbackSchemaTests(unittest.TestCase):
    def test_unknown_question_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            FeedbackCreate(kind="beta_survey", answers={"favourite": "x"})

    def test_overlong_answer_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            FeedbackCreate(
                kind="beta_survey", answers={"would_pay": "x" * 1001}
            )

    def test_blank_answers_are_dropped(self) -> None:
        request = FeedbackCreate(
            kind="beta_survey",
            answers={"would_pay": "  ", "if_found": " email them "},
        )

        self.assertEqual(request.answers, {"if_found": "email them"})

    def test_all_blank_answers_become_none(self) -> None:
        request = FeedbackCreate(
            kind="beta_survey", answers={"would_pay": "  "}
        )

        self.assertIsNone(request.answers)

    def test_blank_message_becomes_none(self) -> None:
        self.assertIsNone(FeedbackCreate(kind="general", message="  ").message)
        self.assertEqual(
            FeedbackCreate(kind="general", message=" hi ").message, "hi"
        )

    def test_unknown_kind_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            FeedbackCreate(kind="match_verdict", message="x")


class FeedbackEndpointTests(FeedbackDataTestCase):
    def setUp(self) -> None:
        super().setUp()

        self.current_user = self.user

        app = FastAPI()
        app.include_router(matches_router, prefix="/api/v1")
        app.include_router(feedback_router, prefix="/api/v1")

        def override_db():
            db = self.session_factory()

            try:
                yield db
            finally:
                db.close()

        def override_user():
            return self.current_user

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = override_user

        self.client = TestClient(app)

    def test_verdict_round_trip_shows_up_on_the_match_list(self) -> None:
        response = self.client.put(
            f"/api/v1/matches/{self.match.id}/feedback",
            json={"verdict": "unrelated"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"match_id": self.match.id, "verdict": "unrelated"},
        )

        listed = self.client.get("/api/v1/matches").json()

        self.assertEqual(listed[0]["feedback_verdict"], "unrelated")

    def test_unrated_match_has_no_verdict(self) -> None:
        listed = self.client.get("/api/v1/matches").json()

        self.assertIsNone(listed[0]["feedback_verdict"])

    def test_changing_the_review_status_keeps_the_verdict_visible(self) -> None:
        self.client.put(
            f"/api/v1/matches/{self.match.id}/feedback",
            json={"verdict": "useful"},
        )

        updated = self.client.patch(
            f"/api/v1/matches/{self.match.id}",
            json={"review_status": "reviewing"},
        ).json()

        self.assertEqual(updated["review_status"], "reviewing")
        self.assertEqual(updated["feedback_verdict"], "useful")

    def test_invalid_verdict_is_rejected(self) -> None:
        response = self.client.put(
            f"/api/v1/matches/{self.match.id}/feedback",
            json={"verdict": "love_it"},
        )

        self.assertEqual(response.status_code, 422)

    def test_other_users_match_is_not_found(self) -> None:
        self.current_user = self.other_user

        response = self.client.put(
            f"/api/v1/matches/{self.match.id}/feedback",
            json={"verdict": "useful"},
        )

        self.assertEqual(response.status_code, 404)

        response = self.client.delete(
            f"/api/v1/matches/{self.match.id}/feedback"
        )

        self.assertEqual(response.status_code, 404)

    def test_delete_clears_the_verdict(self) -> None:
        self.client.put(
            f"/api/v1/matches/{self.match.id}/feedback",
            json={"verdict": "useful"},
        )

        response = self.client.delete(
            f"/api/v1/matches/{self.match.id}/feedback"
        )

        self.assertEqual(response.status_code, 204)

        listed = self.client.get("/api/v1/matches").json()

        self.assertIsNone(listed[0]["feedback_verdict"])

    def test_survey_is_accepted(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            json={
                "kind": "beta_survey",
                "answers": {"check_today": "Google Lens by hand"},
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("id", response.json())

    def test_empty_feedback_is_rejected(self) -> None:
        response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "general", "message": "   "},
        )

        self.assertEqual(response.status_code, 422)

    def test_daily_limit_applies(self) -> None:
        for index in range(MAX_FEEDBACK_ENTRIES_PER_DAY):
            response = self.client.post(
                "/api/v1/feedback",
                json={"kind": "general", "message": f"note {index}"},
            )
            self.assertEqual(response.status_code, 201)

        response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "general", "message": "one too many"},
        )

        self.assertEqual(response.status_code, 429)

    def test_daily_limit_is_per_user(self) -> None:
        for index in range(MAX_FEEDBACK_ENTRIES_PER_DAY):
            self.client.post(
                "/api/v1/feedback",
                json={"kind": "general", "message": f"note {index}"},
            )

        self.current_user = self.other_user

        response = self.client.post(
            "/api/v1/feedback",
            json={"kind": "general", "message": "my first"},
        )

        self.assertEqual(response.status_code, 201)


if __name__ == "__main__":
    unittest.main()
