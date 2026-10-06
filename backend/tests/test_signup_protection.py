import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.config import settings
from app.main import app
from app.models.base import Base
from app.models.email_verification import (
    EmailVerificationToken,
    VerifiedUser,
)
from app.models.user import User
from app.services import abuse_limits, email_identity

ORIGIN = "http://localhost:3000"
GOOD = "correct-horse-battery"


def ip(address: str) -> dict:
    # Our two proxies add the visitor's address second from the right.
    return {"X-Forwarded-For": f"{address}, 10.0.0.1"}


class Base_(unittest.TestCase):
    def setUp(self) -> None:
        for patcher in (
            mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": "k" * 40}),
            mock.patch.object(settings, "allowed_origins", [ORIGIN]),
            mock.patch.object(settings, "trusted_proxy_hops", 2),
            mock.patch.object(settings, "max_signups_per_ip_per_day", 5),
            mock.patch.object(settings, "max_failed_logins_per_email", 10),
            mock.patch.object(settings, "max_failed_logins_per_ip", 30),
            mock.patch.object(settings, "block_disposable_emails", True),
            mock.patch.object(settings, "blocked_email_domains", set()),
            mock.patch.object(settings, "email_verification_required", False),
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

        self.sent: list[tuple[str, str]] = []

        def fake_send(*, to, subject, html, text):
            self.sent.append((to, text))
            return True

        for target in (
            "app.services.email_verification.send_email",
            "app.api.v1.endpoints.auth.send_email",
        ):
            mail = mock.patch(target, side_effect=fake_send)
            mail.start()
            self.addCleanup(mail.stop)

        self.client = TestClient(app, headers={"Origin": ORIGIN})

    def register(self, email, address="203.0.113.7"):
        return self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": GOOD},
            headers=ip(address),
        )

    def login(self, email, password=GOOD, address="203.0.113.7"):
        return self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
            headers=ip(address),
        )


class SignupProtectionTests(Base_):
    def test_throw_away_mail_services_are_refused(self):
        r = self.register("x@mailinator.com")
        self.assertEqual(r.status_code, 422)
        self.assertIn("permanent email", r.json()["detail"])

        self.assertEqual(self.register("x@YOPmail.com").status_code, 422)
        self.assertEqual(self.register("real@example.com").status_code, 201)

    def test_extra_blocked_domains_and_the_off_switch(self):
        with mock.patch.object(
            settings, "blocked_email_domains", {"spam.example"}
        ):
            self.assertEqual(self.register("a@spam.example").status_code, 422)

        with mock.patch.object(settings, "block_disposable_emails", False):
            self.assertEqual(
                self.register("a@mailinator.com").status_code, 201
            )

    def test_one_mailbox_cannot_open_many_accounts(self):
        self.assertEqual(self.register("ann.smith@gmail.com").status_code, 201)

        for alias in (
            "annsmith@gmail.com",
            "ann.smith+shop@gmail.com",
            "a.n.n.s.m.i.t.h+x@googlemail.com",
        ):
            self.assertEqual(self.register(alias).status_code, 409, alias)

        # Dots only count for Gmail; "+tag" counts everywhere.
        self.assertEqual(self.register("bob.lee@example.com").status_code, 201)
        self.assertEqual(self.register("boblee@example.com").status_code, 201)
        self.assertEqual(
            self.register("bob.lee+news@example.com").status_code, 409
        )

    def test_canonical_form(self):
        self.assertEqual(
            email_identity.canonical_email(" A.B+c@Gmail.com "), "ab@gmail.com"
        )
        self.assertEqual(
            email_identity.canonical_email("A.B+c@Example.com"),
            "a.b@example.com",
        )

    def test_accounts_per_address_per_day_are_limited(self):
        with mock.patch.object(settings, "max_signups_per_ip_per_day", 3):
            for n in range(3):
                self.assertEqual(
                    self.register(f"user{n}@example.com").status_code, 201
                )

            blocked = self.register("user3@example.com")
            self.assertEqual(blocked.status_code, 429)
            self.assertIn("tomorrow", blocked.json()["detail"])

            # Somebody else's network is unaffected.
            self.assertEqual(
                self.register("user4@example.com", "198.51.100.9").status_code,
                201,
            )

        with mock.patch.object(settings, "max_signups_per_ip_per_day", 0):
            self.assertEqual(
                self.register("user5@example.com").status_code, 201
            )

    def test_repeated_wrong_passwords_lock_the_sign_in_for_a_while(self):
        self.register("ann@example.com")
        self.register("bob@example.com")

        with mock.patch.object(settings, "max_failed_logins_per_email", 3):
            for _ in range(3):
                self.assertEqual(
                    self.login("ann@example.com", "wrong-pass-1").status_code,
                    401,
                )

            # Even the right password waits, so guessing cannot continue.
            locked = self.login("ann@example.com")
            self.assertEqual(locked.status_code, 429)

            # Another account from the same place is fine.
            self.assertEqual(self.login("bob@example.com").status_code, 200)

    def test_one_address_cannot_try_many_accounts(self):
        self.register("ann@example.com")

        with mock.patch.object(settings, "max_failed_logins_per_ip", 4):
            for n in range(4):
                self.login(f"ghost{n}@example.com", "wrong-pass-1")

            self.assertEqual(self.login("ann@example.com").status_code, 429)
            self.assertEqual(
                self.login("ann@example.com", address="198.51.100.9").status_code,
                200,
            )

    def test_password_reset_requests_are_limited_per_address(self):
        self.register("ann@example.com")

        with mock.patch.object(
            abuse_limits, "MAX_RESET_REQUESTS_PER_IP_PER_HOUR", 2
        ):
            for _ in range(4):
                r = self.client.post(
                    "/api/v1/auth/forgot-password",
                    json={"email": "ann@example.com"},
                    headers=ip("203.0.113.7"),
                )
                # The answer never changes, whatever happens behind it.
                self.assertEqual(r.status_code, 200)

        links = [t for _, t in self.sent if "reset-password" in t]
        self.assertEqual(len(links), 2)


class EmailVerificationTests(Base_):
    def setUp(self) -> None:
        super().setUp()
        patcher = mock.patch.object(settings, "email_verification_required", True)
        patcher.start()
        self.addCleanup(patcher.stop)

    def token_from_mail(self) -> str:
        text = next(t for _, t in reversed(self.sent) if "verify-email" in t)

        return text.split("token=")[1].split()[0].strip()

    def session(self, email="ann@example.com"):
        self.register(email)
        r = self.login(email)
        self.assertEqual(r.status_code, 200)

        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    def me(self, headers):
        return TestClient(app).get("/api/v1/auth/me", headers=headers).json()

    def credits(self, headers):
        return TestClient(app).get("/api/v1/credits", headers=headers).json()

    def test_credits_wait_for_the_confirmed_address(self):
        headers = self.session()

        self.assertFalse(self.me(headers)["email_verified"])
        self.assertEqual(self.credits(headers)["balance"], 0)
        # The mail went out at registration.
        self.assertEqual(self.sent[0][0], "ann@example.com")

        r = self.client.post(
            "/api/v1/auth/verify-email", json={"token": self.token_from_mail()}
        )
        self.assertEqual(r.status_code, 200, r.text)

        self.assertTrue(self.me(headers)["email_verified"])
        self.assertEqual(self.credits(headers)["balance"], 3)

    def test_a_link_works_once_and_only_while_fresh(self):
        self.session()
        token = self.token_from_mail()

        self.assertEqual(
            self.client.post(
                "/api/v1/auth/verify-email", json={"token": token}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/verify-email", json={"token": token}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/v1/auth/verify-email", json={"token": "x" * 40}
            ).status_code,
            400,
        )

    def test_an_expired_link_is_refused(self):
        self.session()
        token = self.token_from_mail()

        with self.Session() as db:
            for record in db.scalars(select(EmailVerificationToken)):
                record.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
            db.commit()

        self.assertEqual(
            self.client.post(
                "/api/v1/auth/verify-email", json={"token": token}
            ).status_code,
            400,
        )

    def test_asking_again_is_limited(self):
        headers = self.session()
        client = TestClient(app, headers={"Origin": ORIGIN})

        # One link went out at registration; two more are allowed.
        for _ in range(2):
            self.assertEqual(
                client.post(
                    "/api/v1/auth/send-verification", headers=headers
                ).status_code,
                200,
            )

        self.assertEqual(
            client.post(
                "/api/v1/auth/send-verification", headers=headers
            ).status_code,
            429,
        )

    def test_nothing_changes_while_the_switch_is_off(self):
        with mock.patch.object(settings, "email_verification_required", False):
            headers = self.session("bob@example.com")

            self.assertTrue(self.me(headers)["email_verified"])
            self.assertEqual(self.credits(headers)["balance"], 3)
            self.assertEqual(self.sent, [])

    def test_admin_can_confirm_an_address(self):
        headers = self.session()

        with self.Session() as db:
            user_id = db.scalar(select(User.id))

        with mock.patch.object(settings, "admin_emails", {"ann@example.com"}), \
                mock.patch.object(settings, "admin_require_google", False):
            r = TestClient(app, headers={"Origin": ORIGIN}).post(
                f"/api/v1/admin/users/{user_id}/verify-email",
                headers=headers,
            )

        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(self.credits(headers)["balance"], 3)

        with self.Session() as db:
            self.assertIsNotNone(db.get(VerifiedUser, user_id))


if __name__ == "__main__":
    unittest.main()
