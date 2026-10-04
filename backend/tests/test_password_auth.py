import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core import security
from app.core.config import settings
from app.core.password_policy import check_password
from app.main import app
from app.models.base import Base
from app.models.password_reset import PasswordResetToken
from app.models.user import User

ORIGIN = "http://localhost:3000"
GOOD = "correct-horse-battery"


class PasswordPolicyTests(unittest.TestCase):
    def test_eight_characters_is_enough(self) -> None:
        self.assertIsNone(check_password("tulip-Rain8"))
        self.assertIsNone(check_password("x7Kp2mQz"))

    def test_too_short(self) -> None:
        self.assertIn("at least 8", check_password("abc1234"))

    def test_common_passwords_refused_any_case(self) -> None:
        self.assertIn("too common", check_password("Password123"))
        self.assertIn("too common", check_password("QWERTYUI"))

    def test_repeated_character_and_email(self) -> None:
        self.assertIsNotNone(check_password("aaaaaaaa"))
        self.assertIsNotNone(
            check_password("semsi123", email="semsi123@example.com")
        )


class AuthFlowTests(unittest.TestCase):
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

        self.sent: list[tuple[str, str]] = []

        def fake_send(*, to, subject, html, text):
            self.sent.append((to, text))
            return True

        mail = mock.patch(
            "app.api.v1.endpoints.auth.send_email", side_effect=fake_send
        )
        mail.start()
        self.addCleanup(mail.stop)

        self.client = TestClient(app, headers={"Origin": ORIGIN})

    def _register(self, password: str = GOOD, email: str = "a@example.com"):
        return self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password},
        )

    def test_register_accepts_8_chars_and_rejects_weak(self) -> None:
        self.assertEqual(self._register("tulip-Rain8").status_code, 201)

        weak = self._register("password123", email="b@example.com")
        self.assertEqual(weak.status_code, 422)
        self.assertIn("too common", weak.json()["detail"])

        short = self._register("abc1234", email="c@example.com")
        self.assertEqual(short.status_code, 422)

    def test_forgot_password_is_the_same_for_unknown_email(self) -> None:
        self._register()

        known = self.client.post(
            "/api/v1/auth/forgot-password", json={"email": "a@example.com"}
        )
        unknown = self.client.post(
            "/api/v1/auth/forgot-password", json={"email": "nobody@example.com"}
        )

        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.json(), unknown.json())
        self.assertEqual([to for to, _ in self.sent], ["a@example.com"])

    def _request_token(self) -> str:
        self.client.post(
            "/api/v1/auth/forgot-password", json={"email": "a@example.com"}
        )
        text = self.sent[-1][1]
        return text.split("token=")[1].split()[0]

    def test_full_reset_flow_works_once(self) -> None:
        self._register()
        token = self._request_token()

        ok = self.client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "password": "brand-new-pass"},
        )
        self.assertEqual(ok.status_code, 200)

        login_new = self.client.post(
            "/api/v1/auth/login",
            json={"email": "a@example.com", "password": "brand-new-pass"},
        )
        login_old = self.client.post(
            "/api/v1/auth/login",
            json={"email": "a@example.com", "password": GOOD},
        )
        self.assertEqual(login_new.status_code, 200)
        self.assertEqual(login_old.status_code, 401)

        again = self.client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "password": "another-pass-1"},
        )
        self.assertEqual(again.status_code, 400)

    def test_reset_refuses_weak_password_and_keeps_link_usable(self) -> None:
        self._register()
        token = self._request_token()

        weak = self.client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "password": "12345678"},
        )
        self.assertEqual(weak.status_code, 422)

        good = self.client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "password": "brand-new-pass"},
        )
        self.assertEqual(good.status_code, 200)

    def test_expired_and_unknown_tokens(self) -> None:
        self._register()
        token = self._request_token()

        with self.Session() as db:
            row = db.scalar(select(PasswordResetToken))
            row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
            db.commit()

        expired = self.client.post(
            "/api/v1/auth/reset-password",
            json={"token": token, "password": "brand-new-pass"},
        )
        unknown = self.client.post(
            "/api/v1/auth/reset-password",
            json={"token": "x" * 43, "password": "brand-new-pass"},
        )
        self.assertEqual(expired.status_code, 400)
        self.assertEqual(unknown.status_code, 400)

    def test_token_is_stored_hashed_and_requests_are_limited(self) -> None:
        self._register()

        for _ in range(5):
            self.client.post(
                "/api/v1/auth/forgot-password",
                json={"email": "a@example.com"},
            )

        self.assertEqual(len(self.sent), 3)

        with self.Session() as db:
            rows = db.scalars(select(PasswordResetToken)).all()

        self.assertEqual(len(rows), 3)

        for to, text in self.sent:
            raw = text.split("token=")[1].split()[0]
            self.assertNotIn(raw, [row.token_hash for row in rows])

    def test_forgot_password_needs_trusted_origin(self) -> None:
        response = TestClient(app, headers={"Origin": "https://evil.example"}).post(
            "/api/v1/auth/forgot-password", json={"email": "a@example.com"}
        )
        self.assertEqual(response.status_code, 403)


class SessionRenewalTests(AuthFlowTests):
    def test_session_lasts_30_days(self) -> None:
        self.assertEqual(security.TOKEN_TTL_SECONDS, 30 * 24 * 3600)

    def test_old_cookie_is_renewed_and_fresh_one_is_not(self) -> None:
        self._register()

        login = self.client.post(
            "/api/v1/auth/session",
            json={"email": "a@example.com", "password": GOOD},
        )
        self.assertEqual(login.status_code, 200)

        fresh = self.client.get("/api/v1/auth/me")
        self.assertEqual(fresh.status_code, 200)
        self.assertNotIn("set-cookie", fresh.headers)

        with mock.patch(
            "app.api.v1.endpoints.auth.token_age_seconds",
            return_value=security.RENEW_AFTER_SECONDS + 60,
        ):
            old = self.client.get("/api/v1/auth/me")

        self.assertEqual(old.status_code, 200)
        self.assertIn("tma_session=", old.headers.get("set-cookie", ""))


if __name__ == "__main__":
    unittest.main()
