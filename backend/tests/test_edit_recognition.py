"""
How well the visual verification recognises edited copies of an artwork,
measured.

This runs the real verify_candidate_image (perceptual hash + watermark read
+ ORB/RANSAC) on edited copies of one registered artwork. It measures
VERIFICATION only: given a candidate image, is it recognised as a copy? It
does not measure DISCOVERY (whether Google Vision or Lens would have found
the page in the first place), and verification is identical for Standard and
Deep scans, so nothing here is a per-scan catch rate.

The public Help page and docs/test-results.md quote this table. Edits listed
as stable gave the same signal on every test image; edits listed as variable
changed between images, so only the set of observed signals is pinned. If
the verification thresholds change, these tests fail on purpose: update
docs/test-results.md and the site copy in the same change.

Images are synthetic "paintings" (shapes plus blur), not real artwork.
"""

from __future__ import annotations

import tempfile
import unittest
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageEnhance

from app.services.visual_verification import verify_candidate_image
from app.services.watermark import embed_watermark
from test_geometric_match import _artwork, _mockup

SECRET = bytes(range(32))
ASSET_ID = 101
USER_ID = 7
SEEDS = (3, 5, 8)
SIZE = 1000

STRONG = "STRONG_VISUAL_MATCH"
POSSIBLE = "POSSIBLE_VISUAL_MATCH"
WEAK = "WEAK_VISUAL_SIGNAL"
VERIFIED = "WATERMARK_VERIFIED"


def _to_pil(bgr: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))


def _to_bgr(image: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)


def _encode(image: Image.Image, fmt: str, **options) -> bytes:
    stream = BytesIO()
    image.save(stream, format=fmt, **options)

    return stream.getvalue()


def _resize(image: Image.Image, factor: float) -> Image.Image:
    return image.resize(
        (int(image.width * factor), int(image.height * factor)),
        Image.LANCZOS,
    )


def _crop(image: Image.Image, box: tuple[float, float, float, float]):
    w, h = image.size
    left, top, right, bottom = box

    return image.crop((int(w * left), int(h * top), int(w * right), int(h * bottom)))


def _shift_hue(image: Image.Image) -> Image.Image:
    hsv = cv2.cvtColor(_to_bgr(image), cv2.COLOR_BGR2HSV)
    hsv[..., 0] = (hsv[..., 0].astype(int) + 60) % 180

    return _to_pil(cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR))


def _sepia(image: Image.Image) -> Image.Image:
    kernel = np.array(
        [[0.272, 0.534, 0.131], [0.349, 0.686, 0.168], [0.393, 0.769, 0.189]]
    )

    return _to_pil(np.clip(_to_bgr(image) @ kernel.T, 0, 255).astype(np.uint8))


def _png(edit):
    return lambda image: _encode(edit(image), "PNG")


# name -> (edit of the marked PNG -> candidate bytes, signals observed)
# One signal means it was the same on every test image.
EDITS: dict[str, tuple] = {
    "Same file (PNG)": (_png(lambda i: i), {VERIFIED}),
    "Resize to 50%": (_png(lambda i: _resize(i, 0.5)), {STRONG}),
    "Resize to 25%": (_png(lambda i: _resize(i, 0.25)), {WEAK, POSSIBLE}),
    "JPEG quality 70": (
        lambda i: _encode(i, "JPEG", quality=70),
        {STRONG},
    ),
    "Screenshot-like (50% + JPEG 80)": (
        lambda i: _encode(_resize(i, 0.5), "JPEG", quality=80),
        {STRONG},
    ),
    "Crop to the middle 60%": (
        _png(lambda i: _crop(i, (0.2, 0.2, 0.8, 0.8))),
        {STRONG},
    ),
    "Crop to a 40% corner": (
        _png(lambda i: _crop(i, (0.0, 0.0, 0.4, 0.4))),
        {POSSIBLE, WEAK},
    ),
    "Black and white": (_png(lambda i: i.convert("L").convert("RGB")), {VERIFIED}),
    "Hue shifted": (_png(_shift_hue), {VERIFIED}),
    "Sepia": (_png(_sepia), {VERIFIED}),
    "Brightness +40%": (
        _png(lambda i: ImageEnhance.Brightness(i).enhance(1.4)),
        {STRONG},
    ),
    "Framed, hung in a room mockup (40% of width)": (
        _png(lambda i: _to_pil(_mockup(_to_bgr(i)))),
        {STRONG},
    ),
    "Small mockup (25% of width)": (
        _png(lambda i: _to_pil(_mockup(_to_bgr(i), scale=0.25))),
        {WEAK, POSSIBLE},
    ),
}

# Candidates that are NOT the artwork: must never be flagged for review.
UNRELATED: dict[str, tuple] = {
    "Unrelated image": lambda seed: _to_pil(_artwork(seed=90 + seed, size=SIZE)),
    "Unrelated image in a mockup": lambda seed: _to_pil(
        _mockup(_artwork(seed=90 + seed, size=SIZE))
    ),
}


def _verify(reference: Path, candidate: bytes):
    return verify_candidate_image(
        reference_path=reference,
        reference_phash=None,
        expected_asset_id=ASSET_ID,
        expected_user_id=USER_ID,
        candidate_content=candidate,
        watermark_secret=SECRET,
    )


def measure() -> tuple[dict, dict]:
    """Per edit, the verification result once per test image."""
    edited = {name: [] for name in EDITS}
    unrelated = {name: [] for name in UNRELATED}

    for seed in SEEDS:
        marked = embed_watermark(
            _to_pil(_artwork(seed=seed, size=SIZE)),
            asset_id=ASSET_ID,
            user_id=USER_ID,
            secret=SECRET,
            timestamp=1_700_000_000,
        ).image

        with tempfile.TemporaryDirectory() as folder:
            reference = Path(folder) / "registered.png"
            marked.save(reference)

            for name, (edit, _signals) in EDITS.items():
                edited[name].append(_verify(reference, edit(marked)))

            for name, make in UNRELATED.items():
                unrelated[name].append(
                    _verify(reference, _encode(make(seed), "PNG"))
                )

    return edited, unrelated


class EditRecognitionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.edited, cls.unrelated = measure()

    def test_each_edit_gets_a_published_signal(self) -> None:
        for name, (_edit, signals) in EDITS.items():
            for seed, result in zip(SEEDS, self.edited[name]):
                with self.subTest(edit=name, seed=seed):
                    self.assertIn(
                        result.overall_signal,
                        signals,
                        f"{name} (seed {seed}): got {result.overall_signal}, "
                        f"published {sorted(signals)}. If this changed on "
                        "purpose, update docs/test-results.md and the site "
                        "copy.",
                    )

    def test_stable_edits_are_flagged_for_review(self) -> None:
        for name, (_edit, signals) in EDITS.items():
            if signals & {WEAK}:
                continue

            for result in self.edited[name]:
                with self.subTest(edit=name):
                    self.assertTrue(result.review_recommended)

    def test_the_watermark_reads_only_where_the_robustness_test_says(
        self,
    ) -> None:
        for name, (_edit, signals) in EDITS.items():
            for result in self.edited[name]:
                with self.subTest(edit=name):
                    self.assertEqual(
                        result.watermark_matches_reference,
                        signals == {VERIFIED},
                    )

    def test_geometric_edits_have_a_low_hash_but_many_inliers(self) -> None:
        # Why the visual comparison exists: a crop or a mockup defeats the
        # perceptual hash, yet ORB finds the same points.
        for name in ("Crop to the middle 60%", "Framed, hung in a room mockup (40% of width)"):
            for result in self.edited[name]:
                with self.subTest(edit=name):
                    self.assertLess(result.phash_similarity_percent, 75.0)
                    self.assertGreaterEqual(result.orb.homography_inliers, 300)

    def test_unrelated_images_are_never_flagged(self) -> None:
        for name, results in self.unrelated.items():
            for result in results:
                with self.subTest(candidate=name):
                    self.assertFalse(result.review_recommended)
                    self.assertFalse(result.watermark_matches_reference)
                    # Raw inlier counts overlap with weak copies (up to 29
                    # observed); the inlier RATIO is what separates them.
                    self.assertLess(result.orb.inlier_ratio_percent, 25.0)


if __name__ == "__main__":
    edited_results, unrelated_results = measure()

    for edit_name, results in {**edited_results, **unrelated_results}.items():
        for r in results:
            ratio = r.orb.inlier_ratio_percent or 0.0
            print(
                f"{edit_name:46s} wm={r.watermark_matches_reference!s:5} "
                f"phash={r.phash_similarity_percent:5.1f}% "
                f"inliers={r.orb.homography_inliers:5d} "
                f"ratio={ratio:5.1f}% {r.overall_signal}"
            )
