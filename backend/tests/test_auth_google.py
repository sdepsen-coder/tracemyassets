import os
import unittest
from unittest import mock
from urllib.parse import parse_qs, urlparse

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.api.v1.endpoints import auth_google as g
from app.core.config import settings
from app.main import app
from app.models.base import Base
from app.models.user import User

FRONT = "https://app.example.com"


def _resp(status, payload):
    return httpx.Response(status, json=payload)


class GoogleSignInTests(unittest.TestCase):
    def setUp(self) -> None:
        env = mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": "k" * 40})
        env.start()
        self.addCleanup(env.stop)

        for name, value in (
            ("google_client_id", "client-id.apps.googleusercontent.com"),
            ("google_client_secret", "client-secret-value"),
            ("frontend_url", FRONT),
        ):
            patcher = mock.patch.object(settings, name, value)
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

        self.client = TestClient(app, follow_redirects=False)

    def _start(self):
        response = self.client.get("/api/v1/auth/google/start")
        self.assertEqual(response.status_code, 302)
        query = parse_qs(urlparse(response.headers["location"]).query)
        return response, query

    def _callback(self, *, state=None, token=None, info=None, **params):
        """Run /start, then /callback with Google's replies faked."""
        _, query = self._start()
        sent = {}

        def fake_post(url, data=None, **kwargs):
            sent["token_request"] = data
            return token or _resp(200, {"access_token": "at-123"})

        def fake_get(url, headers=None, **kwargs):
            sent["auth_header"] = (headers or {}).get("Authorization")
            return info or _resp(
                200, {"email": "Semsi@Example.com", "email_verified": True}
            )

        with mock.patch.object(g.httpx, "post", side_effect=fake_post), \
                mock.patch.object(g.httpx, "get", side_effect=fake_get):
            response = self.client.get(
                "/api/v1/auth/google/callback",
                params={
                    "code": "auth-code",
                    "state": state if state is not None else query["state"][0],
                    **params,
                },
            )

        return response, sent

    def _users(self):
        with self.Session() as db:
            return list(db.scalars(select(User)))

    def test_google_confirms_the_address_and_enforces_one_account_per_mailbox(
        self,
    ) -> None:
        from app.models.email_verification import VerifiedUser

        # A throw-away address is refused even through Google.
        response, _ = self._callback(
            info=_resp(
                200, {"email": "x@mailinator.com", "email_verified": True}
            )
        )
        self.assertIn("auth_error=google_email", response.headers["location"])
        self.assertEqual(self._users(), [])

        # A mailbox that already has an account under another spelling.
        self.client.post(
            "/api/v1/auth/register",
            json={"email": "semsi+shop@example.com", "password": "correct-horse-battery"},
            headers={"Origin": "http://localhost:3000"},
        )
        response, _ = self._callback()
        self.assertIn("auth_error=account_exists", response.headers["location"])
        self.assertEqual(len(self._users()), 1)

        # A fresh one is created and counts as confirmed.
        response, _ = self._callback(
            info=_resp(200, {"email": "new@example.com", "email_verified": True})
        )
        self.assertEqual(response.headers["location"], "/")

        with self.Session() as db:
            user = db.scalar(select(User).where(User.email == "new@example.com"))
            self.assertIsNotNone(db.get(VerifiedUser, user.id))

    def test_providers_reflect_configuration(self) -> None:
        self.assertEqual(
            self.client.get("/api/v1/auth/providers").json(), {"google": True}
        )

        with mock.patch.object(settings, "google_client_secret", ""):
            self.assertEqual(
                self.client.get("/api/v1/auth/providers").json(),
                {"google": False},
            )

    def test_start_sends_the_browser_to_google_with_pkce_and_state(self) -> None:
        response, query = self._start()

        self.assertTrue(
            response.headers["location"].startswith(g.AUTHORIZE_URL)
        )
        self.assertEqual(query["response_type"], ["code"])
        self.assertEqual(query["scope"], ["openid email profile"])
        self.assertEqual(
            query["redirect_uri"], [f"{FRONT}/api/v1/auth/google/callback"]
        )
        self.assertEqual(query["code_challenge_method"], ["S256"])
        self.assertIn("tma_oauth_state", response.cookies)
        self.assertEqual(response.cookies["tma_oauth_state"], query["state"][0])
        self.assertNotIn("client_secret", response.headers["location"])

    def test_start_when_not_configured_goes_home_with_an_error(self) -> None:
        with mock.patch.object(settings, "google_client_id", ""):
            response = self.client.get("/api/v1/auth/google/start")

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.headers["location"], "/?auth_error=google_unavailable"
        )

    def test_callback_creates_the_account_and_signs_in(self) -> None:
        response, sent = self._callback()

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["location"], "/")
        self.assertIn("tma_session", response.cookies)
        self.assertEqual([u.email for u in self._users()], ["semsi@example.com"])
        self.assertEqual(sent["auth_header"], "Bearer at-123")
        self.assertEqual(sent["token_request"]["grant_type"], "authorization_code")
        self.assertEqual(
            sent["token_request"]["redirect_uri"],
            f"{FRONT}/api/v1/auth/google/callback",
        )
        self.assertTrue(sent["token_request"]["code_verifier"])

        # And that cookie really is a working session.
        me = self.client.get("/api/v1/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "semsi@example.com")

    def test_existing_account_with_that_email_is_reused(self) -> None:
        with self.Session() as db:
            db.add(User(email="semsi@example.com", hashed_password="x"))
            db.commit()

        response, _ = self._callback()

        self.assertEqual(response.headers["location"], "/")
        self.assertEqual(len(self._users()), 1)

    def test_google_account_has_no_usable_password(self) -> None:
        self._callback()

        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "semsi@example.com", "password": "anything-at-all"},
        )
        self.assertEqual(login.status_code, 401)

    def test_wrong_state_is_refused_without_calling_google(self) -> None:
        with mock.patch.object(g.httpx, "post") as post:
            _, query = self._start()
            response = self.client.get(
                "/api/v1/auth/google/callback",
                params={"code": "c", "state": "not-the-state"},
            )

        post.assert_not_called()
        self.assertEqual(
            response.headers["location"], "/?auth_error=google_failed"
        )
        self.assertEqual(self._users(), [])

    def test_missing_state_cookie_is_refused(self) -> None:
        response = self.client.get(
            "/api/v1/auth/google/callback", params={"code": "c", "state": "s"}
        )

        self.assertEqual(
            response.headers["location"], "/?auth_error=google_failed"
        )

    def test_unverified_google_email_is_refused(self) -> None:
        response, _ = self._callback(
            info=_resp(200, {"email": "a@b.com", "email_verified": False})
        )

        self.assertEqual(
            response.headers["location"], "/?auth_error=google_email"
        )
        self.assertEqual(self._users(), [])
        self.assertNotIn("tma_session", response.cookies)

    def test_google_refusing_the_code_is_a_clean_failure(self) -> None:
        response, _ = self._callback(
            token=_resp(400, {"error": "invalid_grant"})
        )

        self.assertEqual(
            response.headers["location"], "/?auth_error=google_failed"
        )
        self.assertEqual(self._users(), [])

    def test_network_error_is_a_clean_failure(self) -> None:
        _, query = self._start()

        with mock.patch.object(
            g.httpx, "post", side_effect=httpx.ConnectError("down")
        ):
            response = self.client.get(
                "/api/v1/auth/google/callback",
                params={"code": "c", "state": query["state"][0]},
            )

        self.assertEqual(
            response.headers["location"], "/?auth_error=google_failed"
        )

    def test_person_cancelling_at_google(self) -> None:
        response = self.client.get(
            "/api/v1/auth/google/callback", params={"error": "access_denied"}
        )

        self.assertEqual(
            response.headers["location"], "/?auth_error=google_cancelled"
        )


if __name__ == "__main__":
    unittest.main()
