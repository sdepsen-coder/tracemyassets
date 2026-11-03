import io
import json
import os
import unittest
import zipfile
from unittest import mock

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.api.v1.endpoints import auth_google as g
from app.core.config import settings
from app.core.security import create_access_token
from app.main import app
from app.models.base import Base
from app.models.signup_attribution import SignupAttribution
from app.models.user import User
from app.services import account_deletion
from app.services.signup_attribution import clean_ref

ORIGIN = "http://localhost:3000"
GOOD = "correct-horse-battery"
FRONT = "https://app.example.com"


class CleanRefTests(unittest.TestCase):
    def test_plain_tags_are_kept_in_lower_case(self) -> None:
        self.assertEqual(clean_ref("hearked-bluesky"), "hearked-bluesky")
        self.assertEqual(clean_ref("  Hearked-Bluesky "), "hearked-bluesky")
        self.assertEqual(clean_ref("guide.v2:a_b"), "guide.v2:a_b")

    def test_anything_else_is_ignored(self) -> None:
        for bad in (
            None,
            "",
            "   ",
            "x" * 81,
            "a b",
            "<script>",
            "a;drop table users",
            "-leading-dash",
            "ünï",
            "https://evil.example/",
            123,
        ):
            self.assertIsNone(clean_ref(bad), bad)


class SignupRefTests(unittest.TestCase):
    def setUp(self) -> None:
        env = mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": "k" * 40})
        env.start()
        self.addCleanup(env.stop)

        for name, value in (
            ("allowed_origins", [ORIGIN]),
            ("trusted_proxy_hops", 2),
            ("max_signups_per_ip_per_day", 50),
            ("block_disposable_emails", True),
            ("blocked_email_domains", set()),
            ("email_verification_required", False),
            ("admin_emails", {"boss@example.com"}),
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

        # Foreign keys on, like Postgres: a wrong delete order fails here.
        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_connection, _record):
            dbapi_connection.execute("PRAGMA foreign_keys=ON")

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

    # -- helpers -----------------------------------------------------

    def register(self, email, **extra):
        return self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": GOOD, **extra},
            headers={"X-Forwarded-For": "203.0.113.7, 10.0.0.1"},
        )

    def ref_of(self, email):
        with self.Session() as db:
            user = db.scalar(select(User).where(User.email == email))
            row = db.get(SignupAttribution, user.id)
            return row.ref if row else None

    def user_id(self, email):
        with self.Session() as db:
            return db.scalar(select(User.id).where(User.email == email))

    # -- e-mail sign-up ----------------------------------------------

    def test_register_stores_the_tag(self) -> None:
        r = self.register("a@example.com", ref="Hearked-Bluesky")

        self.assertEqual(r.status_code, 201, r.text)
        self.assertEqual(self.ref_of("a@example.com"), "hearked-bluesky")

    def test_register_without_a_tag_works_and_stores_nothing(self) -> None:
        r = self.register("a@example.com")

        self.assertEqual(r.status_code, 201, r.text)
        self.assertIsNone(self.ref_of("a@example.com"))

    def test_odd_tags_never_block_the_sign_up(self) -> None:
        for index, bad in enumerate(("<script>", "x" * 150, "a b", "")):
            email = f"odd{index}@example.com"
            r = self.register(email, ref=bad)

            self.assertEqual(r.status_code, 201, (bad, r.text))
            self.assertIsNone(self.ref_of(email))

    def test_a_tag_longer_than_the_field_allows_is_refused_cleanly(self) -> None:
        # Beyond the request limit the usual validation applies; the visitor's
        # sign-up form never sends such a value.
        r = self.register("a@example.com", ref="x" * 500)

        self.assertEqual(r.status_code, 422)

    # -- Google sign-up ----------------------------------------------

    def google_signup(self, email, ref=None):
        params = {"ref": ref} if ref is not None else {}
        start = self.client.get(
            "/api/v1/auth/google/start", params=params, follow_redirects=False
        )
        self.assertEqual(start.status_code, 302)
        from urllib.parse import parse_qs, urlparse

        state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

        def fake_post(url, data=None, **kwargs):
            return httpx.Response(200, json={"access_token": "at-123"})

        def fake_get(url, headers=None, **kwargs):
            return httpx.Response(
                200, json={"email": email, "email_verified": True}
            )

        with mock.patch.object(g.httpx, "post", side_effect=fake_post), \
                mock.patch.object(g.httpx, "get", side_effect=fake_get):
            return self.client.get(
                "/api/v1/auth/google/callback",
                params={"code": "auth-code", "state": state},
                follow_redirects=False,
            )

    def test_google_sign_up_stores_the_tag(self) -> None:
        response = self.google_signup("g@example.com", ref="hearked-reddit")

        self.assertEqual(response.headers["location"], "/monitoring")
        self.assertEqual(self.ref_of("g@example.com"), "hearked-reddit")

    def test_google_sign_in_does_not_tag_an_existing_account(self) -> None:
        self.register("g@example.com")

        self.google_signup("g@example.com", ref="hearked-reddit")

        self.assertIsNone(self.ref_of("g@example.com"))

    def test_google_with_a_bad_tag_still_signs_up(self) -> None:
        response = self.google_signup("g@example.com", ref="<b>x</b>")

        self.assertEqual(response.headers["location"], "/monitoring")
        self.assertIsNone(self.ref_of("g@example.com"))

    def test_the_tag_cookie_is_cleared_after_the_round_trip(self) -> None:
        response = self.google_signup("g@example.com", ref="hearked-reddit")

        cleared = [
            value
            for key, value in response.headers.multi_items()
            if key == "set-cookie" and value.startswith("tma_oauth_ref=")
        ]
        self.assertTrue(cleared)
        self.assertIn("Max-Age=0", cleared[0])

    # -- deleting, exporting, admin ----------------------------------

    def test_deleting_the_account_removes_the_tag(self) -> None:
        self.register("a@example.com", ref="hearked-bluesky")
        user_id = self.user_id("a@example.com")

        with self.Session() as db:
            account_deletion.delete_account(db, db.get(User, user_id))

        with self.Session() as db:
            self.assertIsNone(db.get(SignupAttribution, user_id))

    def sign_in(self, email):
        r = self.client.post(
            "/api/v1/auth/session", json={"email": email, "password": GOOD}
        )
        self.assertEqual(r.status_code, 200, r.text)

    def test_the_data_export_includes_the_tag(self) -> None:
        self.register("a@example.com", ref="hearked-bluesky")
        self.sign_in("a@example.com")

        r = self.client.get("/api/v1/account/export")

        self.assertEqual(r.status_code, 200)
        archive = zipfile.ZipFile(io.BytesIO(r.content))
        account = json.loads(archive.read("account.json"))
        self.assertEqual(account["signup_ref"], "hearked-bluesky")

    def test_the_admin_user_list_shows_the_tag(self) -> None:
        self.register("boss@example.com")
        self.register("a@example.com", ref="hearked-bluesky")
        self.register("b@example.com")
        token = create_access_token(self.user_id("boss@example.com"), via="google")

        r = self.client.get(
            "/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"}
        )

        self.assertEqual(r.status_code, 200, r.text)
        refs = {row["email"]: row["signup_ref"] for row in r.json()["items"]}
        self.assertEqual(refs["a@example.com"], "hearked-bluesky")
        self.assertIsNone(refs["b@example.com"])
        self.assertIsNone(refs["boss@example.com"])


if __name__ == "__main__":
    unittest.main()
