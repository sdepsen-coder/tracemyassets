import os
import time
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
from app.models.password_reset import PasswordResetToken
from app.models.user import User

ORIGIN = "http://localhost:3000"
GOOD = "correct-horse-battery"


def token_issued(user_id: int, seconds_ago: int) -> str:
    """A valid session token for the user, issued some seconds ago."""
    issued = datetime.now(timezone.utc) - timedelta(seconds=seconds_ago)

    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": issued,
            "exp": issued + timedelta(seconds=security.TOKEN_TTL_SECONDS),
            "iss": security.TOKEN_ISSUER,
            "aud": security.TOKEN_AUDIENCE,
        },
        security.get_auth_secret(),
        algorithm=security.ALGORITHM,
    )


class SessionRevocationTests(unittest.TestCase):
    def setUp(self) -> None:
        env = mock.patch.dict(
            os.environ, {"AUTH_SECRET_KEY": "k" * 40}, clear=False
        )
        env.start()
        self.addCleanup(env.stop)

        origins = mock.patch.object(settings, "allowed_origins", [ORIGIN])
        origins.start()
        self.addCleanup(origins.stop)

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

        self.sent: list[str] = []

        def fake_send(*, to, subject, html, text):
            self.sent.append(text)
            return True

        mail = mock.patch(
            "app.api.v1.endpoints.auth.send_email", side_effect=fake_send
        )
        mail.start()
        self.addCleanup(mail.stop)

        self.client = TestClient(app, headers={"Origin": ORIGIN})

        self.ids = {}
        for email in ("a@example.com", "b@example.com"):
            r = self.client.post(
                "/api/v1/auth/register",
                json={"email": email, "password": GOOD},
            )
            self.assertEqual(r.status_code, 201)
            self.ids[email] = r.json()["id"]

    def _me(self, token: str):
        # A bearer token, so the client's own cookie never interferes.
        return TestClient(app).get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

    def _reset(self, email: str, new_password: str):
        self.client.post("/api/v1/auth/forgot-password", json={"email": email})

        link = next(t for t in reversed(self.sent) if "token=" in t)
        token = link.split("token=")[1].split()[0].strip()

        return self.client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "password": new_password},
        )

    def test_everything_works_before_any_revocation(self) -> None:
        token = token_issued(self.ids["a@example.com"], 3600)

        self.assertEqual(self._me(token).status_code, 200)

    def test_password_reset_ends_older_sessions_only(self) -> None:
        a = self.ids["a@example.com"]
        old = token_issued(a, 3600)
        other_users = token_issued(self.ids["b@example.com"], 3600)

        self.assertEqual(self._me(old).status_code, 200)
        self.assertEqual(
            self._reset("a@example.com", "brand-new-pass").status_code, 200
        )

        self.assertEqual(self._me(old).status_code, 401)
        # Someone else's session is untouched.
        self.assertEqual(self._me(other_users).status_code, 200)

        # A fresh sign-in with the new password works at once.
        login = self.client.post(
            "/api/v1/auth/login",
            json={"email": "a@example.com", "password": "brand-new-pass"},
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(self._me(login.json()["access_token"]).status_code, 200)

    def test_failed_reset_does_not_end_sessions(self) -> None:
        old = token_issued(self.ids["a@example.com"], 3600)

        refused = self._reset("a@example.com", "password123")
        self.assertEqual(refused.status_code, 422)
        self.assertEqual(self._me(old).status_code, 200)

    def test_logout_all_ends_every_session_and_clears_the_cookie(self) -> None:
        a = self.ids["a@example.com"]
        phone = token_issued(a, 7200)
        login = self.client.post(
            "/api/v1/auth/session",
            json={"email": "a@example.com", "password": GOOD},
        )
        self.assertEqual(login.status_code, 200)

        # Pretend "now" is a few seconds later, as it would be in real use.
        later = time.time() + 5

        with mock.patch(
            "app.services.session_cutoff.time.time", return_value=later
        ):
            out = self.client.post("/api/v1/auth/logout-all")

        self.assertEqual(out.status_code, 204)
        self.assertIn("tma_session=", out.headers.get("set-cookie", ""))
        self.assertEqual(self._me(phone).status_code, 401)
        self.assertEqual(self.client.get("/api/v1/auth/me").status_code, 401)

    def test_logout_all_needs_a_session_and_a_trusted_origin(self) -> None:
        anonymous = TestClient(app, headers={"Origin": ORIGIN})
        self.assertEqual(
            anonymous.post("/api/v1/auth/logout-all").status_code, 401
        )

        self.client.post(
            "/api/v1/auth/session",
            json={"email": "a@example.com", "password": GOOD},
        )
        foreign = self.client.post(
            "/api/v1/auth/logout-all", headers={"Origin": "https://evil.example"}
        )
        self.assertEqual(foreign.status_code, 403)

    def test_cutoff_never_moves_backwards(self) -> None:
        from app.services.session_cutoff import revoke_sessions
        from app.models.session_cutoff import SessionCutoff

        a = self.ids["a@example.com"]
        db = self.Session()

        with mock.patch(
            "app.services.session_cutoff.time.time", return_value=2000.0
        ):
            revoke_sessions(db, a)
        with mock.patch(
            "app.services.session_cutoff.time.time", return_value=1000.0
        ):
            revoke_sessions(db, a)
        db.commit()

        self.assertEqual(db.get(SessionCutoff, a).valid_from, 2000)
        db.close()


if __name__ == "__main__":
    unittest.main()
