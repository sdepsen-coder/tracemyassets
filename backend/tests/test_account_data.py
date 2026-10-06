import io
import json
import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.main import app
from app.models.asset import Asset
from app.models.base import Base
from app.models.credit_entry import CreditEntry
from app.models.deleted_signup import DeletedSignup
from app.models.feedback import FeedbackEntry
from app.models.match_record import MatchRecord
from app.models.monitoring import MonitoringPreference
from app.models.scan_job import ScanJob
from app.models.user import User
from app.models.user_event import UserEvent
from app.services import account_deletion, credits

ORIGIN = "http://localhost:3000"
GOOD = "correct-horse-battery"


class AccountDataTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()

        for patcher in (
            mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": "k" * 40}),
            mock.patch.object(settings, "allowed_origins", [ORIGIN]),
            mock.patch.object(settings, "trusted_proxy_hops", 2),
            mock.patch.object(settings, "max_signups_per_ip_per_day", 50),
            mock.patch.object(settings, "block_disposable_emails", True),
            mock.patch.object(settings, "blocked_email_domains", set()),
            mock.patch.object(settings, "email_verification_required", False),
            mock.patch.object(settings, "admin_emails", {"boss@example.com"}),
            mock.patch("app.services.asset_paths.DEFAULT_STORAGE_ROOT", self.root),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        # Enforce foreign keys like Postgres does, so a wrong delete order
        # fails here and not in production.
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

    def signup(self, email: str) -> int:
        r = self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": GOOD},
            headers={"X-Forwarded-For": "203.0.113.7, 10.0.0.1"},
        )
        self.assertEqual(r.status_code, 201, r.text)
        return r.json()["id"]

    def signin(self, email: str) -> None:
        r = self.client.post(
            "/api/v1/auth/session", json={"email": email, "password": GOOD}
        )
        self.assertEqual(r.status_code, 200, r.text)

    def give_history(self, user_id: int, title: str) -> int:
        """An artwork with files, scan, match, monitoring, credit, feedback."""
        with self.Session() as db:
            key = f"user{user_id}-{title}"
            folder = self.root / key
            folder.mkdir(parents=True)
            (folder / "original.png").write_bytes(b"ORIGINAL-" + title.encode())
            (folder / "watermarked.png").write_bytes(b"PROTECTED")

            asset = Asset(
                user_id=user_id,
                title=title,
                original_url=f"{key}/original.png",
                watermarked_url=f"{key}/watermarked.png",
                watermark_payload="SECRET-PAYLOAD",
            )
            db.add(asset)
            db.flush()

            job = ScanJob(asset_id=asset.id, provider="fake")
            db.add(job)
            db.flush()
            db.add(
                MonitoringPreference(
                    asset_id=asset.id, enabled=True, scan_frequency="weekly"
                )
            )
            db.add(
                MatchRecord(
                    asset_id=asset.id,
                    scan_job_id=job.id,
                    source_name="Demo",
                    similarity_percent=90.0,
                )
            )
            db.add(
                FeedbackEntry(user_id=user_id, kind="general", message="hello")
            )
            db.add(
                CreditEntry(
                    user_id=user_id, delta=5, reason="grant", note="test grant"
                )
            )
            db.commit()
            return asset.id

    def count(self, model, *conditions) -> int:
        with self.Session() as db:
            return db.scalar(
                select(func.count()).select_from(model).where(*conditions)
            ) or 0

    # -- export ------------------------------------------------------

    def test_export_has_only_your_data_and_no_secrets(self):
        mine = self.signup("me@example.com")
        other = self.signup("other@example.com")
        self.give_history(mine, "Botanical")
        self.give_history(other, "Strangers-art")

        self.signin("me@example.com")
        r = self.client.get("/api/v1/account/export")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["content-type"], "application/zip")

        archive = zipfile.ZipFile(io.BytesIO(r.content))
        names = set(archive.namelist())

        self.assertIn("README.txt", names)
        self.assertTrue(
            any(n.startswith("files/originals/") and "Botanical" in n for n in names)
        )
        self.assertTrue(any(n.startswith("files/protected-copies/") for n in names))
        self.assertFalse(any("Strangers" in n for n in names))

        everything = "\n".join(
            archive.read(n).decode("utf-8", "ignore")
            for n in names
            if n.endswith(".json")
        )
        self.assertIn("me@example.com", everything)
        self.assertNotIn("other@example.com", everything)
        self.assertNotIn("Strangers-art", everything)
        self.assertNotIn("hashed_password", everything)
        self.assertNotIn("SECRET-PAYLOAD", everything)
        self.assertEqual(
            len(json.loads(archive.read("matches.json"))), 1
        )
        self.assertEqual(
            json.loads(archive.read("artworks.json"))[0]["monitoring"][
                "scan_frequency"
            ],
            "weekly",
        )

    def test_export_is_limited_to_a_few_per_hour(self):
        self.signup("me@example.com")
        self.signin("me@example.com")

        codes = [
            self.client.get("/api/v1/account/export").status_code
            for _ in range(4)
        ]
        self.assertEqual(codes, [200, 200, 200, 429])

    def test_export_needs_a_session(self):
        self.assertEqual(self.client.get("/api/v1/account/export").status_code, 401)

    # -- deletion ----------------------------------------------------

    def delete(self, **body):
        return self.client.post("/api/v1/account/delete", json=body)

    def test_delete_removes_everything_and_only_that_account(self):
        mine = self.signup("me@example.com")
        other = self.signup("other@example.com")
        self.give_history(mine, "Botanical")
        keep = self.give_history(other, "Keep-me")

        self.signin("me@example.com")

        self.assertEqual(
            self.delete(confirm_email="nope@example.com", password=GOOD).status_code,
            422,
        )
        self.assertEqual(
            self.delete(confirm_email="me@example.com", password="wrong-pass-123").status_code,
            403,
        )
        self.assertEqual(self.count(User, User.id == mine), 1)

        r = self.delete(confirm_email="  ME@example.com ", password=GOOD)
        self.assertEqual(r.status_code, 204, r.text)
        self.assertIn("tma_session", r.headers.get("set-cookie", ""))

        self.assertEqual(self.count(User, User.id == mine), 0)
        self.assertEqual(self.count(Asset, Asset.user_id == mine), 0)
        self.assertEqual(self.count(CreditEntry, CreditEntry.user_id == mine), 0)
        self.assertEqual(self.count(FeedbackEntry, FeedbackEntry.user_id == mine), 0)
        self.assertFalse((self.root / f"user{mine}-Botanical").exists())

        # The other person is untouched.
        self.assertEqual(self.count(User, User.id == other), 1)
        self.assertEqual(self.count(Asset, Asset.id == keep), 1)
        self.assertEqual(self.count(MatchRecord, MatchRecord.asset_id == keep), 1)
        self.assertTrue((self.root / f"user{other}-Keep-me" / "original.png").exists())

        # The log no longer points at the person, and shows the deletion.
        self.assertEqual(self.count(UserEvent, UserEvent.user_id == mine), 0)
        self.assertEqual(self.count(UserEvent, UserEvent.email == "me@example.com"), 0)
        self.assertEqual(
            self.count(UserEvent, UserEvent.event_type == "account_deleted"), 1
        )

        # Signing in no longer works.
        again = self.client.post(
            "/api/v1/auth/session",
            json={"email": "me@example.com", "password": GOOD},
        )
        self.assertEqual(again.status_code, 401)

    def test_a_google_only_person_needs_a_recent_google_sign_in(self):
        uid = self.signup("g@example.com")
        self.signin("g@example.com")

        # No password given and no recent Google sign-in.
        r = self.delete(confirm_email="g@example.com")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["detail"], "reauth_required")

        # An older Google sign-in is not enough.
        stale = create_access_token(uid, via="google")
        future = __import__("time").time() + 31 * 60
        with mock.patch("app.api.v1.endpoints.account.time.time", return_value=future):
            r = self.client.post(
                "/api/v1/account/delete",
                json={"confirm_email": "g@example.com"},
                headers={"Authorization": f"Bearer {stale}"},
            )
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.count(User, User.id == uid), 1)

        fresh = create_access_token(uid, via="google")
        r = self.client.post(
            "/api/v1/account/delete",
            json={"confirm_email": "g@example.com"},
            headers={"Authorization": f"Bearer {fresh}"},
        )
        self.assertEqual(r.status_code, 204, r.text)
        self.assertEqual(self.count(User, User.id == uid), 0)

    def test_administrators_cannot_delete_themselves_here(self):
        uid = self.signup("boss@example.com")
        self.signin("boss@example.com")
        r = self.delete(confirm_email="boss@example.com", password=GOOD)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self.count(User, User.id == uid), 1)

    def test_delete_needs_a_session(self):
        r = self.delete(confirm_email="x@example.com", password=GOOD)
        self.assertEqual(r.status_code, 401)

    # -- coming back -------------------------------------------------

    def test_registering_again_does_not_give_welcome_credits_twice(self):
        first = self.signup("me@example.com")
        with self.Session() as db:
            self.assertEqual(credits.get_credit_summary(db, first), 3)

        self.signin("me@example.com")
        self.assertEqual(
            self.delete(confirm_email="me@example.com", password=GOOD).status_code,
            204,
        )
        self.assertEqual(self.count(DeletedSignup), 1)

        # Same mailbox, and a "+tag" spelling of it, are both recognised.
        for email in ("me@example.com", "me+again@example.com"):
            self.client.cookies.clear()
            uid = self.signup(email)
            with self.Session() as db:
                self.assertEqual(credits.get_credit_summary(db, uid), 0, email)
            self.signin(email)
            self.delete(confirm_email=email, password=GOOD)

        # A brand-new mailbox still gets the credits.
        self.client.cookies.clear()
        fresh = self.signup("new@example.com")
        with self.Session() as db:
            self.assertEqual(credits.get_credit_summary(db, fresh), 3)

    def test_the_fingerprint_holds_no_address_and_expires(self):
        uid = self.signup("me@example.com")
        self.signin("me@example.com")
        self.delete(confirm_email="me@example.com", password=GOOD)

        with self.Session() as db:
            row = db.scalars(select(DeletedSignup)).one()
            self.assertEqual(len(row.key_hash), 64)

            from datetime import datetime, timedelta, timezone

            later = datetime.now(timezone.utc) + timedelta(days=366)
            self.assertEqual(account_deletion.purge_old_fingerprints(db, now=later), 1)
            self.assertEqual(db.scalar(select(func.count()).select_from(DeletedSignup)), 0)


if __name__ == "__main__":
    unittest.main()
