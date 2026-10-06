import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core import security
from app.core.config import settings
from app.main import app
from app.models.base import Base
from app.models.credit_entry import CreditEntry
from app.models.feedback import FeedbackEntry
from app.models.user import User
from app.models.user_event import UserEvent
from app.models.user_suspension import UserSuspension
from app.services import user_events

ORIGIN = "http://localhost:3000"
GOOD = "correct-horse-battery"
ADMIN = "boss@example.com"


def token_for(user_id: int, *, seconds_ago: int = 5, via: str | None = None):
    issued = datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)
    claims = {
        "sub": str(user_id),
        "iat": issued,
        "exp": issued + timedelta(seconds=security.TOKEN_TTL_SECONDS),
        "iss": security.TOKEN_ISSUER,
        "aud": security.TOKEN_AUDIENCE,
    }

    if via:
        claims["via"] = via

    return jwt.encode(
        claims, security.get_auth_secret(), algorithm=security.ALGORITHM
    )


class AdminTests(unittest.TestCase):
    def setUp(self) -> None:
        for patcher in (
            mock.patch.dict(
                os.environ, {"AUTH_SECRET_KEY": "k" * 40}, clear=False
            ),
            mock.patch.object(settings, "allowed_origins", [ORIGIN]),
            mock.patch.object(settings, "admin_emails", {ADMIN}),
            mock.patch.object(settings, "admin_require_google", True),
            mock.patch.object(settings, "admin_session_minutes", 120),
            mock.patch.object(settings, "trusted_proxy_hops", 2),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(engine)
        self.Session = sessionmaker(bind=engine)

        def override_db():
            session = self.Session()
            try:
                yield session
            finally:
                session.close()

        app.dependency_overrides[get_db] = override_db
        self.addCleanup(app.dependency_overrides.clear)

        self.client = TestClient(app, headers={"Origin": ORIGIN})
        self.ids = {}

        for email in (ADMIN, "ann@example.com", "bob@example.com"):
            r = self.client.post(
                "/api/v1/auth/register",
                json={"email": email, "password": GOOD},
                headers={"X-Forwarded-For": "9.9.9.9, 1.2.3.4, 10.0.0.1"},
            )
            self.assertEqual(r.status_code, 201, r.text)
            self.ids[email] = r.json()["id"]

        self.admin_token = token_for(self.ids[ADMIN], via="google")

    def get(self, path, token=None, **kwargs):
        token = token or self.admin_token

        return TestClient(app).get(
            f"/api/v1/admin{path}",
            headers={"Authorization": f"Bearer {token}"},
            **kwargs,
        )

    def post(self, path, json=None, token=None):
        token = token or self.admin_token

        return TestClient(app).post(
            f"/api/v1/admin{path}",
            json=json or {},
            headers={"Authorization": f"Bearer {token}"},
        )

    # --- who gets in -----------------------------------------------------

    def test_anonymous_is_refused_and_ordinary_users_see_not_found(self):
        self.assertEqual(
            TestClient(app).get("/api/v1/admin/overview").status_code, 401
        )

        ann = token_for(self.ids["ann@example.com"], via="google")
        self.assertEqual(self.get("/overview", token=ann).status_code, 404)
        self.assertEqual(self.get("/users", token=ann).status_code, 404)

    def test_admin_needs_a_recent_google_sign_in(self):
        mine = self.ids[ADMIN]

        password_only = token_for(mine)
        r = self.get("/me", token=password_only)
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["detail"], "admin_google_signin_required")

        stale = token_for(mine, via="google", seconds_ago=3 * 3600)
        self.assertEqual(self.get("/me", token=stale).status_code, 403)

        self.assertEqual(self.get("/me").status_code, 200)
        self.assertEqual(self.get("/me").json()["email"], ADMIN)

    def test_google_requirement_can_be_switched_off_for_development(self):
        with mock.patch.object(settings, "admin_require_google", False):
            r = self.get("/me", token=token_for(self.ids[ADMIN]))

        self.assertEqual(r.status_code, 200)

    def test_me_tells_the_app_who_is_an_admin(self):
        def me(email):
            token = token_for(self.ids[email])

            return TestClient(app).get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            ).json()

        self.assertTrue(me(ADMIN)["is_admin"])
        self.assertFalse(me("ann@example.com")["is_admin"])

    def test_a_renewed_session_is_not_a_fresh_google_sign_in(self):
        old = token_for(self.ids[ADMIN], via="google", seconds_ago=25 * 3600)
        client = TestClient(app, headers={"Origin": ORIGIN})
        client.cookies.set("tma_session", old, path="/api/v1")

        me = client.get("/api/v1/auth/me")
        self.assertEqual(me.status_code, 200)

        renewed = me.cookies.get("tma_session")
        self.assertIsNotNone(renewed)
        self.assertIsNone(security.decode_access_token_details(renewed)[2])

    # --- activity log ----------------------------------------------------

    def events(self, **filters):
        with self.Session() as db:
            stmt = select(UserEvent).order_by(UserEvent.id)

            for key, value in filters.items():
                stmt = stmt.where(getattr(UserEvent, key) == value)

            return list(db.scalars(stmt))

    def test_sign_up_and_sign_in_are_logged_with_the_visitors_ip(self):
        signups = self.events(event_type=user_events.REGISTER)
        self.assertEqual(len(signups), 3)
        # Read from the right: the entry our own proxies added, never the
        # value a visitor wrote at the left.
        self.assertEqual(signups[0].ip_address, "1.2.3.4")

        ok = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": GOOD},
            headers={"User-Agent": "TestBrowser/1.0"},
        )
        self.assertEqual(ok.status_code, 200)

        bad = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": "wrong-password"},
        )
        self.assertEqual(bad.status_code, 401)

        nobody = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ghost@example.com", "password": "whatever-123"},
        )
        self.assertEqual(nobody.status_code, 401)

        login = self.events(event_type=user_events.LOGIN)[0]
        self.assertEqual(login.user_agent, "TestBrowser/1.0")
        self.assertEqual(login.user_id, self.ids["ann@example.com"])

        failed = self.events(event_type=user_events.LOGIN_FAILED)
        self.assertEqual(len(failed), 2)
        self.assertEqual(failed[1].email, "ghost@example.com")
        self.assertIsNone(failed[1].user_id)

    def test_feedback_and_password_reset_are_logged(self):
        ann = token_for(self.ids["ann@example.com"])

        r = TestClient(app).post(
            "/api/v1/feedback",
            json={"kind": "general", "message": "Lovely app"},
            headers={"Authorization": f"Bearer {ann}"},
        )
        self.assertEqual(r.status_code, 201, r.text)

        self.client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "ann@example.com"},
        )

        self.assertEqual(len(self.events(event_type=user_events.FEEDBACK)), 1)
        self.assertEqual(
            len(self.events(event_type=user_events.PASSWORD_RESET_REQUESTED)),
            1,
        )

    def test_old_events_are_purged_and_recent_ones_kept(self):
        with self.Session() as db:
            db.add(
                UserEvent(
                    event_type="login",
                    email="old@example.com",
                    created_at=datetime.now(timezone.utc)
                    - timedelta(days=settings.event_retention_days + 1),
                )
            )
            db.commit()

            removed = user_events.purge_old_events(db)

        self.assertEqual(removed, 1)
        self.assertEqual(self.events(email="old@example.com"), [])
        self.assertEqual(len(self.events(event_type="register")), 3)

    # --- the pages -------------------------------------------------------

    def test_overview_counts(self):
        body = self.get("/overview").json()

        self.assertEqual(body["users_total"], 3)
        self.assertEqual(body["users_new_24h"], 3)
        self.assertEqual(body["users_active_24h"], 3)
        self.assertEqual(body["failed_sign_ins_24h"], 0)
        self.assertEqual(len(body["sign_ups_by_day"]), 14)
        self.assertEqual(body["sign_ups_by_day"][-1][1], 3)
        self.assertEqual(body["event_retention_days"], 90)
        self.assertEqual(
            body["serpapi"]["daily_limit"], settings.serpapi_daily_limit
        )

    def test_user_list_search_and_detail(self):
        body = self.get("/users").json()
        self.assertEqual(body["total"], 3)
        self.assertEqual(body["items"][0]["email"], "bob@example.com")

        found = self.get("/users", params={"q": "ANN@"}).json()
        self.assertEqual([u["email"] for u in found["items"]], ["ann@example.com"])
        self.assertIsNotNone(found["items"][0]["last_sign_in"])
        self.assertTrue(self.get("/users").json()["items"][2]["is_admin"])

        detail = self.get(f"/users/{self.ids['ann@example.com']}").json()
        self.assertEqual(detail["user"]["email"], "ann@example.com")
        self.assertEqual(detail["ips"][0]["ip_address"], "1.2.3.4")
        self.assertEqual(detail["events"][0]["event_type"], "register")

        self.assertEqual(self.get("/users/9999").status_code, 404)

    def test_feedback_list_shows_who_wrote_it(self):
        with self.Session() as db:
            db.add(
                FeedbackEntry(
                    user_id=self.ids["bob@example.com"],
                    kind="general",
                    message="Needs a dark mode",
                )
            )
            db.add(
                FeedbackEntry(
                    user_id=self.ids["bob@example.com"],
                    kind="beta_survey",
                    answers_json='{"easy": "yes"}',
                )
            )
            db.commit()

        everything = self.get("/feedback").json()
        self.assertEqual(everything["total"], 2)
        self.assertEqual(everything["items"][0]["email"], "bob@example.com")
        self.assertEqual(everything["items"][0]["answers"], {"easy": "yes"})

        only = self.get("/feedback", params={"kind": "general"}).json()
        self.assertEqual(only["total"], 1)
        self.assertEqual(only["items"][0]["message"], "Needs a dark mode")

    def test_event_search_by_ip_and_email(self):
        by_ip = self.get("/events", params={"q": "1.2.3"}).json()
        self.assertEqual(by_ip["total"], 3)

        by_mail = self.get("/events", params={"q": "bob@"}).json()
        self.assertEqual(by_mail["total"], 1)

        typed = self.get("/events", params={"event_type": "login"}).json()
        self.assertEqual(typed["total"], 0)

    # --- actions ---------------------------------------------------------

    def test_adding_credits_changes_the_balance_and_is_logged(self):
        ann = self.ids["ann@example.com"]

        self.assertEqual(
            self.post(f"/users/{ann}/credits", {"amount": 5}).status_code, 200
        )
        self.assertEqual(
            self.post(f"/users/{ann}/credits", {"amount": 0}).status_code, 422
        )

        with self.Session() as db:
            total = sum(
                db.scalars(
                    select(CreditEntry.delta).where(CreditEntry.user_id == ann)
                )
            )

        self.assertEqual(total, 5)

        actions = self.events(event_type=user_events.ADMIN_ACTION)
        self.assertEqual(len(actions), 1)
        self.assertEqual(actions[0].user_id, self.ids[ADMIN])
        self.assertIn("+5 credits", actions[0].detail)

    def test_plan_change(self):
        ann = self.ids["ann@example.com"]

        self.assertEqual(
            self.post(f"/users/{ann}/plan", {"plan_type": "Pro"}).status_code,
            200,
        )
        self.assertEqual(
            self.post(f"/users/{ann}/plan", {"plan_type": "Gold"}).status_code,
            422,
        )

        with self.Session() as db:
            self.assertEqual(db.get(User, ann).plan_type, "Pro")

    def test_suspending_blocks_sign_in_and_existing_sessions(self):
        ann = self.ids["ann@example.com"]
        before = token_for(ann, seconds_ago=60)

        self.assertEqual(
            TestClient(app)
            .get("/api/v1/auth/me", headers={"Authorization": f"Bearer {before}"})
            .status_code,
            200,
        )

        r = self.post(f"/users/{ann}/suspend", {"reason": "abuse"})
        self.assertEqual(r.status_code, 200)

        me = TestClient(app).get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {before}"}
        )
        self.assertEqual(me.status_code, 401)  # sessions ended

        # A session that somehow outlives the suspension is still refused.
        bob = self.ids["bob@example.com"]

        with self.Session() as db:
            db.add(UserSuspension(user_id=bob))
            db.commit()

        me = TestClient(app).get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_for(bob)}"},
        )
        self.assertEqual(me.status_code, 403)

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": GOOD},
        )
        self.assertEqual(login.status_code, 403)

        detail = self.get(f"/users/{ann}").json()
        self.assertTrue(detail["user"]["suspended"])
        self.assertEqual(detail["suspension_reason"], "abuse")

        self.assertEqual(self.post(f"/users/{ann}/unsuspend").status_code, 200)

        again = self.client.post(
            "/api/v1/auth/login",
            json={"email": "ann@example.com", "password": GOOD},
        )
        self.assertEqual(again.status_code, 200)

        with self.Session() as db:
            self.assertIsNone(db.get(UserSuspension, ann))

    def test_an_admin_cannot_be_suspended(self):
        r = self.post(f"/users/{self.ids[ADMIN]}/suspend")

        self.assertEqual(r.status_code, 422)

    def test_revoke_sessions_signs_the_user_out(self):
        bob = self.ids["bob@example.com"]
        old = token_for(bob, seconds_ago=120)

        self.assertEqual(
            self.post(f"/users/{bob}/revoke-sessions").status_code, 200
        )
        self.assertEqual(
            TestClient(app)
            .get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old}"})
            .status_code,
            401,
        )

    def test_an_unknown_user_is_not_found(self):
        self.assertEqual(
            self.post("/users/999/credits", {"amount": 1}).status_code, 404
        )


if __name__ == "__main__":
    unittest.main()
