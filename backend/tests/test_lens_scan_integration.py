"""
A deep scan end to end: the real Lens provider (SerpApi answered by a fake
transport) feeding the real scan runner and the real verification
pipeline. Only the network (fetching candidate images and pages) is
replaced, so this shows that what Lens finds really goes through our own
checks before it can become a match.
"""

import os
import unittest
from unittest import mock

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import test_scan_runner_providers as base
from app.core.config import settings
from app.models.base import Base
from app.models.match_record import MatchRecord
from app.models.provider_usage import ProviderUsage
from app.services import serpapi_lens_search as lens
from app.services.asset_paths import load_watermark_secret
from app.services.page_check import PageStatus
from app.services.scan_runner import run_scan_for_asset

API_KEY = "sk-secret-serpapi-key-DO-NOT-LEAK"
SECRET = "unit-test-secret-key-0123456789abcdef0123456789"


class LensDeepScanIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        base.RunScanForAssetMultiProviderTests.setUp(self)

        env = mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": SECRET})
        env.start()
        self.addCleanup(env.stop)

        for name, value in (
            ("public_backend_url", "https://api.example.com"),
            ("frontend_url", "https://app.example.com"),
            ("serpapi_daily_limit", 5),
            ("serpapi_monthly_limit", 50),
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
        self.usage_factory = sessionmaker(bind=engine)

        self.status = 200
        self.reply = {
            "exact_matches": [
                {
                    "link": "https://www.etsy.com/listing/111/a-copy",
                    "title": "A copy of my art",
                    "image": "https://i.etsystatic.com/a.jpg",
                },
                {
                    "link": "https://es.pinterest.com/pin/222/",
                    "title": "Pinned",
                },
                {
                    "link": "https://de.pinterest.com/pin/222/",
                    "title": "Pinned again",
                },
                {"link": "https://www.google.com/search?q=x"},
            ]
        }

    def _provider(self) -> lens.SerpApiLensProvider:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(self.status, json=self.reply)

        client = httpx.Client(transport=httpx.MockTransport(handler))
        self.addCleanup(client.close)

        return lens.SerpApiLensProvider(
            api_key=API_KEY,
            client=client,
            session_factory=self.usage_factory,
        )

    def _scan(self, provider):
        artwork = self.image_path.read_bytes()

        with mock.patch(
            "app.services.scan_runner.fetch_candidate_bytes",
            side_effect=lambda url: artwork,
        ), mock.patch(
            "app.services.scan_runner.check_candidate_page",
            return_value=PageStatus.CONFIRMED,
        ), mock.patch(
            "app.services.scan_runner.read_page_images",
            return_value=(None, ["https://i.pinimg.com/pin.jpg"]),
        ):
            return run_scan_for_asset(
                self.db,
                asset=self.asset,
                user_id=self.user_id,
                preference=self.preference,
                reference_path=self.image_path,
                watermarked_path=None,
                watermark_secret=load_watermark_secret(),
                providers=[provider],
            )

    def _spent(self) -> int:
        db = self.usage_factory()
        self.addCleanup(db.close)

        return sum(row.units for row in db.scalars(select(ProviderUsage)))

    def test_what_lens_finds_becomes_verified_matches(self) -> None:
        outcome = self._scan(self._provider())

        self.assertEqual(outcome.provider_name, "serpapi-lens")
        self.assertEqual(outcome.scan_job.provider, "serpapi-lens")
        self.assertEqual(outcome.diagnostics.providers_asked, 1)
        self.assertEqual(outcome.diagnostics.provider_failures, 0)
        self.assertFalse(outcome.diagnostics.no_search_made)
        # The Etsy page and the one (de-duplicated) Pinterest pin.
        self.assertEqual(outcome.diagnostics.candidates, 2)
        self.assertEqual(len(outcome.matches), 2)
        self.assertEqual(outcome.new_match_count, 2)

        labels = sorted(match.source_name for match in outcome.matches)

        self.assertEqual(labels, ["Etsy listing", "pinterest.com: Pinned"])

        pages = {match.candidate_page_url for match in outcome.matches}

        self.assertEqual(
            pages,
            {
                "https://www.etsy.com/listing/111/a-copy",
                "https://www.pinterest.com/pin/222/",
            },
        )

        stored = list(self.db.scalars(select(MatchRecord)))

        self.assertEqual(len(stored), 2)

    def test_a_result_that_only_has_a_thumbnail_is_still_checked(self) -> None:
        self.reply = {
            "exact_matches": [
                {
                    "link": "https://www.etsy.com/listing/111/a-copy",
                    "title": "A copy of my art",
                    "thumbnail": "https://encrypted-tbn0.gstatic.com/images?q=tbn:abc",
                }
            ]
        }

        outcome = self._scan(self._provider())

        self.assertEqual(outcome.diagnostics.no_image_address, 0)
        self.assertEqual(len(outcome.matches), 1)
        self.assertEqual(
            outcome.matches[0].candidate_image_url,
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:abc",
        )

    def test_an_inline_thumbnail_is_checked_without_downloading_anything(
        self,
    ) -> None:
        import base64

        artwork = self.image_path.read_bytes()
        self.reply = {
            "exact_matches": [
                {
                    "link": "https://www.etsy.com/listing/111/a-copy",
                    "title": "A copy of my art",
                    "thumbnail": "data:image/png;base64,"
                    + base64.b64encode(artwork).decode(),
                }
            ]
        }

        with mock.patch(
            "app.services.scan_runner.fetch_candidate_bytes"
        ) as download, mock.patch(
            "app.services.scan_runner.check_candidate_page",
            return_value=PageStatus.CONFIRMED,
        ):
            outcome = run_scan_for_asset(
                self.db,
                asset=self.asset,
                user_id=self.user_id,
                preference=self.preference,
                reference_path=self.image_path,
                watermarked_path=None,
                watermark_secret=load_watermark_secret(),
                providers=[self._provider()],
            )

        download.assert_not_called()
        self.assertEqual(outcome.diagnostics.no_image_address, 0)
        self.assertEqual(len(outcome.matches), 1)

    def test_the_search_is_counted_once(self) -> None:
        self._scan(self._provider())

        self.assertEqual(self._spent(), 1)

    def test_a_second_deep_scan_does_not_count_old_matches_as_new(self) -> None:
        self._scan(self._provider())
        second = self._scan(self._provider())

        self.assertEqual(len(second.matches), 2)
        self.assertEqual(second.new_match_count, 0)

    def test_candidates_that_do_not_match_are_dropped(self) -> None:
        self.reply = {
            "exact_matches": [
                {
                    "link": "https://shop.example/other",
                    "title": "Something else",
                    "image": "https://shop.example/other.jpg",
                }
            ]
        }

        with mock.patch(
            "app.services.scan_runner.fetch_candidate_bytes",
            side_effect=lambda url: b"not an image at all",
        ):
            outcome = run_scan_for_asset(
                self.db,
                asset=self.asset,
                user_id=self.user_id,
                preference=self.preference,
                reference_path=self.image_path,
                watermarked_path=None,
                watermark_secret=load_watermark_secret(),
                providers=[self._provider()],
            )

        self.assertEqual(outcome.matches, [])
        self.assertEqual(outcome.diagnostics.not_comparable, 1)

    def test_a_failed_search_ends_the_scan_cleanly_and_leaks_no_key(self) -> None:
        self.status = 500

        with self.assertLogs("tracemyassets.scan_runner", "ERROR") as logs:
            outcome = self._scan(self._provider())

        self.assertEqual(outcome.matches, [])
        self.assertEqual(outcome.diagnostics.candidates, 0)
        self.assertEqual(outcome.scan_job.status, "completed")
        # ...and it says no search was made, which is what earns the
        # credit back (see app.services.credits).
        self.assertEqual(outcome.diagnostics.providers_asked, 1)
        self.assertEqual(outcome.diagnostics.provider_failures, 1)
        self.assertTrue(outcome.diagnostics.no_search_made)

        everything = "\n".join(logs.output)

        self.assertIn("serpapi-lens", everything)
        self.assertNotIn(API_KEY, everything)

    def test_a_spent_allowance_ends_the_scan_cleanly_without_a_search(self) -> None:
        provider = self._provider()

        with mock.patch.object(settings, "serpapi_daily_limit", 0):
            with self.assertLogs("tracemyassets.scan_runner", "ERROR"):
                outcome = self._scan(provider)

        self.assertEqual(outcome.matches, [])
        self.assertEqual(self._spent(), 0)
        # A spent allowance means no search was made either.
        self.assertTrue(outcome.diagnostics.no_search_made)


if __name__ == "__main__":
    unittest.main()
