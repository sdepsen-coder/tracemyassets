"""
A match that rests on the perceptual hash alone (small preview, no ORB or
watermark evidence) is confirmed against the page's own full-size images
before it is recorded: only a page that was read and clearly does not show
the artwork drops it.
"""

import unittest
from unittest import mock

import test_scan_runner_providers as base
from app.services.asset_paths import load_watermark_secret
from app.services.page_check import PageStatus
from app.services.scan_runner import run_scan_for_asset
from app.services.visual_search_provider import DiscoveredCandidate
from app.services.visual_verification import (
    OrbComparison,
    VisualVerificationResult,
)

THUMB = b"small-preview"
FULL_COPY = b"full-size-copy"
FULL_OTHER = b"full-size-other-product"


def _result(*, similarity, inliers, ratio, signal):
    return VisualVerificationResult(
        watermark_payload=None,
        watermark_matches_reference=False,
        reference_phash="af07927ae0c6c6b8",
        candidate_phash="af07925ae0c7c6b8",
        phash_hamming_distance=2,
        phash_similarity_percent=similarity,
        orb=OrbComparison(
            reference_keypoints=500,
            candidate_keypoints=50,
            good_matches=12,
            homography_inliers=inliers,
            inlier_ratio_percent=ratio,
        ),
        overall_signal=signal,
        review_recommended=False,
    )


# The preview: hashes alike (97%) but ORB finds nothing to back it up.
PREVIEW = _result(
    similarity=97.0, inliers=0, ratio=0.0, signal="NO_STRONG_VISUAL_MATCH"
)
# A page image that really is the artwork.
REAL = _result(
    similarity=100.0, inliers=900, ratio=95.0, signal="STRONG_VISUAL_MATCH"
)
# A page image of a different product that merely resembles it.
OTHER = _result(
    similarity=60.0, inliers=3, ratio=10.0, signal="NO_STRONG_VISUAL_MATCH"
)


def _verify(*, candidate_content, **_):
    return {THUMB: PREVIEW, FULL_COPY: REAL, FULL_OTHER: OTHER}[
        candidate_content
    ]


class HashOnlyMatchTests(unittest.TestCase):
    setUp = base.RunScanForAssetMultiProviderTests.setUp

    def scan(self, *, page_images, page_url="https://shop.example/p/1",
             stale=False, signal_candidate=THUMB):
        candidate = DiscoveredCandidate(
            source_name="Some shop",
            source_url=page_url,
            candidate_image_url="https://encrypted-tbn0.gstatic.com/x",
            candidate_page_url=page_url,
            candidate_image_bytes=signal_candidate,
            page_may_be_stale=stale,
        )

        with mock.patch(
            "app.services.scan_runner.verify_candidate_image",
            side_effect=_verify,
        ), mock.patch(
            "app.services.scan_runner.read_page_images",
            return_value=page_images,
        ), mock.patch(
            "app.services.scan_runner.fetch_candidate_bytes",
            side_effect=lambda url: {
                "https://shop.example/full-copy.jpg": FULL_COPY,
                "https://shop.example/other.jpg": FULL_OTHER,
            }.get(url),
        ), mock.patch(
            "app.services.scan_runner.check_candidate_page",
            return_value=PageStatus.CONFIRMED,
        ) as checker:
            outcome = run_scan_for_asset(
                self.db,
                asset=self.asset,
                user_id=self.user_id,
                preference=self.preference,
                reference_path=self.image_path,
                watermarked_path=None,
                watermark_secret=load_watermark_secret(),
                providers=[base._WorkingProvider("serpapi-lens", [candidate])],
            )

        return outcome, checker

    def test_page_that_shows_the_artwork_keeps_the_match(self) -> None:
        outcome, _ = self.scan(
            page_images=(None, ["https://shop.example/other.jpg",
                                "https://shop.example/full-copy.jpg"])
        )

        self.assertEqual(len(outcome.matches), 1)
        self.assertEqual(outcome.diagnostics.page_unrelated, 0)

    def test_page_that_clearly_does_not_show_it_drops_the_match(self) -> None:
        outcome, _ = self.scan(
            page_images=(None, ["https://shop.example/other.jpg"])
        )

        self.assertEqual(outcome.matches, [])
        self.assertEqual(outcome.diagnostics.page_unrelated, 1)

    def test_unreadable_page_keeps_the_match(self) -> None:
        from app.services.page_check import PageStatus as S

        outcome, _ = self.scan(page_images=(S.BLOCKED, []))

        self.assertEqual(len(outcome.matches), 1)

    def test_page_images_that_cannot_be_fetched_keep_the_match(self) -> None:
        outcome, _ = self.scan(
            page_images=(None, ["https://shop.example/unfetchable.jpg"])
        )

        self.assertEqual(len(outcome.matches), 1)

    def test_candidate_without_a_page_is_unchanged(self) -> None:
        outcome, _ = self.scan(page_images=(None, []), page_url=None)

        self.assertEqual(len(outcome.matches), 1)

    def test_confirmed_by_content_skips_the_second_page_check(self) -> None:
        outcome, checker = self.scan(
            page_images=(None, ["https://shop.example/full-copy.jpg"]),
            stale=True,
        )

        self.assertEqual(len(outcome.matches), 1)
        checker.assert_not_called()


class StrongMatchesAreNotSecondGuessedTests(unittest.TestCase):
    setUp = base.RunScanForAssetMultiProviderTests.setUp

    def test_geometric_evidence_needs_no_page_read(self) -> None:
        candidate = DiscoveredCandidate(
            source_name="Some shop",
            source_url="https://shop.example/p/2",
            candidate_image_url="https://cdn.example/a.jpg",
            candidate_page_url="https://shop.example/p/2",
            candidate_image_bytes=FULL_COPY,
        )

        with mock.patch(
            "app.services.scan_runner.verify_candidate_image",
            side_effect=_verify,
        ), mock.patch(
            "app.services.scan_runner.read_page_images"
        ) as reader:
            outcome = run_scan_for_asset(
                self.db,
                asset=self.asset,
                user_id=self.user_id,
                preference=self.preference,
                reference_path=self.image_path,
                watermarked_path=None,
                watermark_secret=load_watermark_secret(),
                providers=[base._WorkingProvider("serpapi-lens", [candidate])],
            )

        reader.assert_not_called()
        self.assertEqual(len(outcome.matches), 1)


if __name__ == "__main__":
    unittest.main()
