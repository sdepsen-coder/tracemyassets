"""
scan_runner drops matches whose source page is gone or unrelated, when the
provider says the page comes from a possibly stale search index.
"""

import unittest
from unittest import mock

import test_scan_runner_providers as base
from app.services.asset_paths import load_watermark_secret
from app.services.page_check import PageStatus
from app.services.scan_runner import run_scan_for_asset
from app.services.visual_search_provider import DiscoveredCandidate


class ScanRunnerPageCheckTests(unittest.TestCase):
    setUp = base.RunScanForAssetMultiProviderTests.setUp

    def scan(self, *, page_url, status, stale=True):
        candidate = DiscoveredCandidate(
            source_name="Some page",
            source_url=page_url,
            candidate_image_url="https://cdn.example/images/abcdef123456.jpg",
            candidate_page_url=page_url,
            candidate_image_bytes=self.image_path.read_bytes(),
            page_may_be_stale=stale,
        )

        with mock.patch(
            "app.services.scan_runner.check_candidate_page",
            return_value=status,
        ) as checker:
            outcome = run_scan_for_asset(
                self.db,
                asset=self.asset,
                user_id=self.user_id,
                preference=self.preference,
                reference_path=self.image_path,
                watermarked_path=None,
                watermark_secret=load_watermark_secret(),
                providers=[base._WorkingProvider("google-vision", [candidate])],
            )

        return outcome, checker

    def test_gone_page_is_not_recorded(self) -> None:
        outcome, _ = self.scan(
            page_url="https://shop.example/p/1", status=PageStatus.GONE
        )
        self.assertEqual(outcome.matches, [])

    def test_confirmed_page_is_recorded(self) -> None:
        outcome, _ = self.scan(
            page_url="https://shop.example/p/1", status=PageStatus.CONFIRMED
        )
        self.assertEqual(len(outcome.matches), 1)

    def test_unconfirmed_page_on_unknown_host_is_not_recorded(self) -> None:
        outcome, _ = self.scan(
            page_url="https://random.example/p/1",
            status=PageStatus.UNCONFIRMED,
        )
        self.assertEqual(outcome.matches, [])

    def test_unconfirmed_page_on_marketplace_is_recorded(self) -> None:
        outcome, _ = self.scan(
            page_url="https://www.amazon.com.au/dp/X",
            status=PageStatus.UNCONFIRMED,
        )
        self.assertEqual(len(outcome.matches), 1)

    def test_blocked_page_is_recorded(self) -> None:
        outcome, _ = self.scan(
            page_url="https://shop.example/p/1", status=PageStatus.BLOCKED
        )
        self.assertEqual(len(outcome.matches), 1)

    def test_live_provider_results_skip_the_page_check(self) -> None:
        outcome, checker = self.scan(
            page_url="https://www.amazon.co.uk/dp/X",
            status=PageStatus.GONE,
            stale=False,
        )
        checker.assert_not_called()
        self.assertEqual(len(outcome.matches), 1)

    def test_diagnostics_explain_where_candidates_went(self) -> None:
        good = self.image_path.read_bytes()

        def candidate(**kwargs):
            defaults = dict(
                source_name="c",
                source_url="https://x.example/p",
                candidate_image_url="https://cdn.example/a.jpg",
                candidate_page_url="https://x.example/p",
                candidate_image_bytes=good,
            )
            defaults.update(kwargs)
            return DiscoveredCandidate(**defaults)

        candidates = [
            candidate(),  # recorded
            candidate(
                candidate_image_bytes=None,
                candidate_image_url=None,
            ),  # no image address
            candidate(
                candidate_image_bytes=b"not an image",
            ),  # not comparable
            candidate(
                page_may_be_stale=True,
                candidate_page_url="https://gone.example/p",
            ),  # page gone
        ]

        def fake_page_check(page_url, image_url):
            return (
                PageStatus.GONE
                if "gone.example" in page_url
                else PageStatus.CONFIRMED
            )

        with mock.patch(
            "app.services.scan_runner.check_candidate_page",
            side_effect=fake_page_check,
        ):
            outcome = run_scan_for_asset(
                self.db,
                asset=self.asset,
                user_id=self.user_id,
                preference=self.preference,
                reference_path=self.image_path,
                watermarked_path=None,
                watermark_secret=load_watermark_secret(),
                providers=[base._WorkingProvider("google-vision", candidates)],
            )

        d = outcome.diagnostics
        self.assertEqual(d.candidates, 4)
        self.assertEqual(d.recorded, 1)
        self.assertEqual(d.no_image_address, 1)
        self.assertEqual(d.not_comparable, 1)
        self.assertEqual(d.page_gone, 1)
        self.assertEqual(d.below_threshold, 0)
        self.assertEqual(d.image_unreachable, 0)
        self.assertGreaterEqual(d.best_similarity_percent, 99.0)


if __name__ == "__main__":
    unittest.main()
