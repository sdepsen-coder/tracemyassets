import os
import tempfile
import time
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user, get_db
from app.api.v1.endpoints import assets as assets_endpoints
from app.api.v1.endpoints.assets import router as assets_router
from app.api.v1.endpoints.public_images import router as public_router
from app.core.config import settings
from app.models.asset import Asset
from app.models.base import Base
from app.models.provider_usage import ProviderUsage
from app.models.user import User
from app.schemas.asset import AssetScanRead, ScanJobRead
from app.services import signed_image_links as links

SECRET = "unit-test-secret-key-0123456789abcdef0123456789"
PNG_ORIGINAL = b"\x89PNG\r\n\x1a\n-original-bytes"
PNG_PROTECTED = b"\x89PNG\r\n\x1a\n-protected-bytes"


def make_session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    return sessionmaker(bind=engine)


class EndpointTestCase(unittest.TestCase):
    def setUp(self) -> None:
        env = mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": SECRET})
        env.start()
        self.addCleanup(env.stop)

        self.session_factory = make_session_factory()
        self.db = self.session_factory()
        self.addCleanup(self.db.close)

        self.storage = Path(tempfile.mkdtemp())
        root = mock.patch(
            "app.services.asset_paths.DEFAULT_STORAGE_ROOT", self.storage
        )
        root.start()
        self.addCleanup(root.stop)

        self.owner = self._user("owner@example.com", "Internal")
        self.current_user = self.owner

    def _user(self, email: str, plan: str) -> User:
        user = User(email=email, hashed_password="x", plan_type=plan)
        self.db.add(user)
        self.db.commit()

        return user

    def _asset(
        self,
        *,
        status: str = "active",
        with_watermark: bool = True,
        write_files: bool = True,
        user: User | None = None,
    ) -> Asset:
        owner = user or self.owner
        asset = Asset(
            user_id=owner.id,
            title="Piece",
            original_url="pending",
            status=status,
        )
        self.db.add(asset)
        self.db.flush()

        folder = f"{owner.id}/{asset.id}"
        asset.original_url = f"{folder}/original.png"

        if with_watermark:
            asset.watermarked_url = f"{folder}/watermarked.png"

        self.db.commit()

        if write_files:
            directory = self.storage / folder
            directory.mkdir(parents=True)
            (directory / "original.png").write_bytes(PNG_ORIGINAL)

            if with_watermark:
                (directory / "watermarked.png").write_bytes(PNG_PROTECTED)

        return asset

    def _client(self, *routers) -> TestClient:
        app = FastAPI()

        for router in routers:
            app.include_router(router, prefix="/api/v1")

        def override_db():
            db = self.session_factory()

            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.current_user

        return TestClient(app)

    @staticmethod
    def _link(asset_id: int, *, expires_at: int | None = None) -> str:
        expires = (
            int(time.time()) + 300 if expires_at is None else expires_at
        )

        return (
            f"/api/v1/public/asset-image/{asset_id}/{expires}/"
            f"{links.sign(asset_id, expires)}.png"
        )


class PublicImageTests(EndpointTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.client = self._client(public_router)

    def test_a_valid_link_serves_the_protected_copy(self) -> None:
        asset = self._asset()

        response = self.client.get(self._link(asset.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, PNG_PROTECTED)
        self.assertEqual(response.headers["content-type"], "image/png")

    def test_the_link_is_not_cacheable_or_indexable(self) -> None:
        asset = self._asset()

        headers = self.client.get(self._link(asset.id)).headers

        self.assertEqual(headers["cache-control"], "private, no-store")
        self.assertIn("noindex", headers["x-robots-tag"])
        self.assertEqual(headers["x-content-type-options"], "nosniff")

    def test_an_artwork_without_a_protected_copy_serves_the_original(
        self,
    ) -> None:
        asset = self._asset(with_watermark=False)

        response = self.client.get(self._link(asset.id))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, PNG_ORIGINAL)

    def test_a_missing_protected_file_falls_back_to_the_original(self) -> None:
        asset = self._asset()
        (self.storage / f"{self.owner.id}/{asset.id}/watermarked.png").unlink()

        response = self.client.get(self._link(asset.id))

        self.assertEqual(response.content, PNG_ORIGINAL)

    def test_a_forged_signature_is_not_found(self) -> None:
        asset = self._asset()
        expires = int(time.time()) + 300

        response = self.client.get(
            f"/api/v1/public/asset-image/{asset.id}/{expires}/{'0' * 64}.png"
        )

        self.assertEqual(response.status_code, 404)

    def test_an_expired_link_is_not_found(self) -> None:
        asset = self._asset()

        response = self.client.get(
            self._link(asset.id, expires_at=int(time.time()) - 5)
        )

        self.assertEqual(response.status_code, 404)

    def test_a_link_for_one_artwork_does_not_open_another(self) -> None:
        first = self._asset()
        second = self._asset()
        expires = int(time.time()) + 300
        signature = links.sign(first.id, expires)

        response = self.client.get(
            f"/api/v1/public/asset-image/{second.id}/{expires}/{signature}.png"
        )

        self.assertEqual(response.status_code, 404)

    def test_an_archived_artwork_is_not_served(self) -> None:
        asset = self._asset(status="archived")

        self.assertEqual(
            self.client.get(self._link(asset.id)).status_code, 404
        )

    def test_an_unknown_artwork_is_not_found(self) -> None:
        self.assertEqual(self.client.get(self._link(9999)).status_code, 404)

    def test_missing_files_are_not_found(self) -> None:
        asset = self._asset(write_files=False)

        self.assertEqual(
            self.client.get(self._link(asset.id)).status_code, 404
        )

    def test_every_refusal_looks_the_same(self) -> None:
        asset = self._asset()
        expired = self.client.get(
            self._link(asset.id, expires_at=int(time.time()) - 5)
        )
        unknown = self.client.get(self._link(9999))

        self.assertEqual(expired.json(), unknown.json())


def scan_result(asset_id: int) -> AssetScanRead:
    now = datetime.now(timezone.utc)

    return AssetScanRead(
        asset_id=asset_id,
        provider="serpapi-lens",
        threshold_percent=80.0,
        scan_job=ScanJobRead(
            id=1,
            asset_id=asset_id,
            provider="serpapi-lens",
            status="completed",
            started_at=now,
            completed_at=now,
            candidate_count=0,
            match_count=0,
            error_message=None,
            created_at=now,
            updated_at=now,
        ),
        matches=[],
    )


class DeepScanEndpointTests(EndpointTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.client = self._client(assets_router)

        for name, value in (
            ("serpapi_api_key", "key"),
            ("public_backend_url", "https://api.example.com"),
            ("serpapi_daily_limit", 5),
            ("serpapi_monthly_limit", 50),
        ):
            patcher = mock.patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

        self.sentinel = object()
        deep = mock.patch.object(
            assets_endpoints,
            "get_deep_scan_providers",
            return_value=[self.sentinel],
        )
        self.get_deep = deep.start()
        self.addCleanup(deep.stop)

        run = mock.patch.object(
            assets_endpoints, "_execute_scan", side_effect=self._fake_scan
        )
        self.execute = run.start()
        self.addCleanup(run.stop)

    @staticmethod
    def _fake_scan(db, *, asset, user, preference, providers):
        return scan_result(asset.id)

    def test_an_internal_account_can_run_one(self) -> None:
        asset = self._asset()

        response = self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["provider"], "serpapi-lens")

    def test_it_runs_only_the_deep_scan_providers(self) -> None:
        asset = self._asset()

        self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(
            self.execute.call_args.kwargs["providers"], [self.sentinel]
        )

    def test_other_plans_are_refused_before_anything_is_spent(self) -> None:
        for plan in ("Free", "Pro", "Something else"):
            with self.subTest(plan=plan):
                self.current_user = self._user(f"{plan}@example.com", plan)
                asset = self._asset(user=self.current_user)

                response = self.client.post(
                    f"/api/v1/assets/{asset.id}/deep-scan"
                )

                self.assertEqual(response.status_code, 403)

        self.execute.assert_not_called()
        self.get_deep.assert_not_called()

    def test_someone_elses_artwork_is_not_found(self) -> None:
        asset = self._asset()
        self.current_user = self._user("other@example.com", "Internal")

        response = self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(response.status_code, 404)
        self.execute.assert_not_called()

    def test_an_unconfigured_provider_is_a_clean_503(self) -> None:
        asset = self._asset()
        self.get_deep.side_effect = RuntimeError(
            "Deep scan is not configured (SERPAPI_API_KEY is not set)."
        )

        response = self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(response.status_code, 503)
        self.assertIn("SERPAPI_API_KEY", response.json()["detail"])
        self.execute.assert_not_called()

    def test_a_spent_daily_allowance_is_a_429_before_any_scan(self) -> None:
        asset = self._asset()
        self.db.add(ProviderUsage(provider="serpapi", units=5))
        self.db.commit()

        response = self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(response.status_code, 429)
        self.assertIn("today", response.json()["detail"])
        self.execute.assert_not_called()

    def test_a_spent_monthly_allowance_is_a_429(self) -> None:
        asset = self._asset()
        now = datetime.now(timezone.utc)
        month_start = now.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        # Spread over the month but not today, so only the monthly
        # allowance is exhausted. (On the 1st that is the same day, in
        # which case the daily message applies instead.)
        self.db.add(
            ProviderUsage(provider="serpapi", units=50, created_at=month_start)
        )
        self.db.commit()

        response = self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(response.status_code, 429)

    def test_other_providers_spending_does_not_count(self) -> None:
        asset = self._asset()
        self.db.add(ProviderUsage(provider="somebody-else", units=500))
        self.db.commit()

        response = self.client.post(f"/api/v1/assets/{asset.id}/deep-scan")

        self.assertEqual(response.status_code, 200)


class OrdinaryScanUnchangedTests(EndpointTestCase):
    def test_the_ordinary_scan_still_uses_the_configured_providers(self) -> None:
        client = self._client(assets_router)
        asset = self._asset()
        sentinel = object()

        with mock.patch.object(
            assets_endpoints,
            "get_configured_providers",
            return_value=[sentinel],
        ), mock.patch.object(
            assets_endpoints,
            "_execute_scan",
            return_value=scan_result(asset.id),
        ) as execute, mock.patch.object(
            assets_endpoints, "get_deep_scan_providers"
        ) as deep:
            response = client.post(f"/api/v1/assets/{asset.id}/scan")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(execute.call_args.kwargs["providers"], [sentinel])
        deep.assert_not_called()


if __name__ == "__main__":
    unittest.main()
