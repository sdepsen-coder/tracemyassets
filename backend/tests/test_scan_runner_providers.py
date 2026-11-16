"""
Tests for scan_runner's multi-provider aggregation: several discovery
providers run per scan, pooled into one ScanJob, and one provider
failing at search time must not lose the candidates the other
provider(s) already found (see scan_runner._collect_candidates).
"""

import os
import shutil
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
from PIL import Image
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.models.asset import Asset
from app.models.base import Base
from app.models.match_record import MatchRecord
from app.models.monitoring import MonitoringPreference
from app.models.scan_diagnostic import ScanDiagnostic
from app.models.user import User
from app.services.asset_ingestion import DEFAULT_STORAGE_ROOT
from app.services.asset_paths import load_watermark_secret
from app.services.scan_runner import _collect_candidates, run_scan_for_asset
from app.services.visual_search_provider import DiscoveredCandidate


class _FailingProvider:
    name = "failing"

    def find_candidates(self, **kwargs):
        raise RuntimeError("simulated provider outage")


class _WorkingProvider:
    def __init__(self, name: str, candidates: list[DiscoveredCandidate]) -> None:
        self.name = name
        self._candidates = candidates

    def find_candidates(self, **kwargs):
        return self._candidates


class CollectCandidatesTests(unittest.TestCase):
    def test_a_failing_provider_does_not_lose_the_others_candidates(
        self,
    ) -> None:
        candidate = DiscoveredCandidate(
            source_name="Working source",
            source_url="https://example.com",
            candidate_image_url=None,
            candidate_page_url="https://example.com/page",
            candidate_image_bytes=b"fake-bytes",
        )

        providers = [_FailingProvider(), _WorkingProvider("working", [candidate])]

        collected = _collect_candidates(
            providers,
            asset_id=1,
            asset_title="Anything",
            reference_path=Path("/dev/null"),
            watermarked_path=None,
        )

        self.assertEqual(collected, [candidate])

    def test_every_provider_failing_returns_an_empty_list_not_an_error(
        self,
    ) -> None:
        providers = [_FailingProvider(), _FailingProvider()]

        collected = _collect_candidates(
            providers,
            asset_id=1,
            asset_title="Anything",
            reference_path=Path("/dev/null"),
            watermarked_path=None,
        )

        self.assertEqual(collected, [])


class RunScanForAssetMultiProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        env_patch = mock.patch.dict(
            os.environ, {"WATERMARK_SECRET_HEX": "00" * 32}
        )
        env_patch.start()
        self.addCleanup(env_patch.stop)

        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)

        session_factory = sessionmaker(bind=engine)
        self.db = session_factory()
        self.addCleanup(self.db.close)

        user = User(email="artist@example.com", hashed_password="hashed")
        self.db.add(user)
        self.db.flush()
        self.user_id = user.id

        self.storage_dir = (
            DEFAULT_STORAGE_ROOT / "test-scan-runner-providers-fixture"
        )
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.addCleanup(
            lambda: shutil.rmtree(self.storage_dir, ignore_errors=True)
        )

        self.image_path = self.storage_dir / "original.png"
        y, x = np.indices((256, 256), dtype=np.uint16)
        gradient = np.stack(
            (48 + x // 4, 64 + y // 4, 80 + (x + y) // 8), axis=-1
        ).astype(np.uint16)
        texture = np.random.default_rng(0).integers(
            0, 255, size=(256, 256, 3), dtype=np.uint16
        )
        pixels = (0.6 * gradient + 0.4 * texture).astype(np.uint8)

        with Image.fromarray(pixels) as image:
            image.save(self.image_path, format="PNG")

        self.asset = Asset(
            user_id=self.user_id,
            title="Scan runner fixture asset",
            original_url="test-scan-runner-providers-fixture/original.png",
        )
        self.db.add(self.asset)
        self.db.flush()

        self.preference = MonitoringPreference(
            asset_id=self.asset.id,
            enabled=True,
            alert_threshold_percent=50.0,
            scan_frequency="weekly",
        )
        self.db.add(self.preference)
        self.db.commit()

    def test_scan_job_provider_column_lists_every_configured_provider(
        self,
    ) -> None:
        candidate = DiscoveredCandidate(
            source_name="Amazon (amazon.co.uk): a matching listing",
            source_url="https://www.amazon.co.uk/dp/EXAMPLE",
            candidate_image_url=None,
            candidate_page_url="https://www.amazon.co.uk/dp/EXAMPLE",
            candidate_image_bytes=self.image_path.read_bytes(),
        )

        providers = [
            _FailingProvider(),
            _WorkingProvider("rainforest-amazon", [candidate]),
        ]

        outcome = run_scan_for_asset(
            self.db,
            asset=self.asset,
            user_id=self.user_id,
            preference=self.preference,
            reference_path=self.image_path,
            watermarked_path=None,
            watermark_secret=load_watermark_secret(),
            providers=providers,
        )

        self.assertEqual(outcome.provider_name, "failing,rainforest-amazon")
        self.assertEqual(outcome.scan_job.provider, "failing,rainforest-amazon")

        # The failing provider must not have prevented the working
        # provider's verbatim-copy candidate from becoming a match.
        self.assertEqual(len(outcome.matches), 1)
        self.assertEqual(
            outcome.matches[0].source_name,
            "Amazon (amazon.co.uk): a matching listing",
        )

        stored_matches = list(
            self.db.scalars(
                select(MatchRecord).where(
                    MatchRecord.asset_id == self.asset.id
                )
            )
        )
        self.assertEqual(len(stored_matches), 1)

    def _scan(self, providers):
        return run_scan_for_asset(
            self.db,
            asset=self.asset,
            user_id=self.user_id,
            preference=self.preference,
            reference_path=self.image_path,
            watermarked_path=None,
            watermark_secret=load_watermark_secret(),
            providers=providers,
        )

    def _diagnostics_of(self, outcome) -> ScanDiagnostic:
        return self.db.scalar(
            select(ScanDiagnostic).where(
                ScanDiagnostic.scan_job_id == outcome.scan_job.id
            )
        )

    def test_a_finished_scan_keeps_why_candidates_were_dropped(self) -> None:
        copy = DiscoveredCandidate(
            source_name="Shop",
            source_url="https://shop.example.com/a",
            candidate_image_url=None,
            candidate_page_url="https://shop.example.com/a",
            candidate_image_bytes=self.image_path.read_bytes(),
        )
        unreachable = DiscoveredCandidate(
            source_name="Blog",
            source_url="https://blog.example.com/b",
            candidate_image_url="https://blog.example.com/b.jpg",
            candidate_page_url="https://blog.example.com/b",
        )

        with mock.patch(
            "app.services.scan_runner.fetch_candidate_bytes",
            return_value=None,
        ):
            outcome = self._scan(
                [_WorkingProvider("working", [copy, unreachable])]
            )

        row = self._diagnostics_of(outcome)

        self.assertIsNotNone(row)
        self.assertEqual(row.candidates, 2)
        self.assertEqual(row.recorded, 1)
        self.assertEqual(row.image_unreachable, 1)
        self.assertEqual(row.below_threshold, 0)
        self.assertEqual((row.providers_asked, row.provider_failures), (1, 0))
        # Counts only: nothing in the row can hold an address.
        self.assertFalse(
            any("http" in str(v) for v in vars(row).values() if v is not None)
        )

    def test_a_scan_where_every_provider_failed_says_so(self) -> None:
        outcome = self._scan([_FailingProvider()])
        row = self._diagnostics_of(outcome)

        self.assertEqual(row.candidates, 0)
        self.assertEqual((row.providers_asked, row.provider_failures), (1, 1))

    def test_deleting_the_asset_deletes_its_diagnostics(self) -> None:
        from app.crud.asset import delete_asset

        outcome = self._scan([_WorkingProvider("working", [])])
        self.assertIsNotNone(self._diagnostics_of(outcome))

        delete_asset(self.db, asset=self.asset)
        self.db.commit()

        self.assertEqual(list(self.db.scalars(select(ScanDiagnostic))), [])


if __name__ == "__main__":
    unittest.main()
