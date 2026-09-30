"""
Cropped, framed or mockup-embedded copies of an artwork must be found even
though their whole-image perceptual hash is low. See
visual_verification.is_geometric_copy.
"""

import io
import unittest

import cv2
import imagehash
import numpy as np
from PIL import Image

from app.services.visual_verification import (
    classify_match,
    compare_orb,
    is_geometric_copy,
)


def _artwork(seed: int = 3, size: int = 480) -> np.ndarray:
    """A detailed synthetic painting: many shapes, so ORB has features."""
    rng = np.random.default_rng(seed)
    image = np.full((size, size, 3), 235, np.uint8)

    for _ in range(140):
        colour = tuple(int(v) for v in rng.integers(20, 240, 3))
        centre = tuple(int(v) for v in rng.integers(0, size, 2))

        if rng.random() < 0.5:
            cv2.circle(image, centre, int(rng.integers(6, 40)), colour, -1)
        else:
            corner = (
                min(size - 1, centre[0] + int(rng.integers(10, 70))),
                min(size - 1, centre[1] + int(rng.integers(10, 70))),
            )
            cv2.rectangle(image, centre, corner, colour, -1)

    return cv2.GaussianBlur(image, (0, 0), 1.2)


def _mockup(art: np.ndarray, scale: float = 0.4) -> np.ndarray:
    """The artwork framed and hung, in perspective, on a plain wall."""
    rng = np.random.default_rng(9)
    width, height = 1200, 900
    wall = cv2.GaussianBlur(
        rng.integers(205, 230, (height, width, 3)).astype(np.uint8), (0, 0), 3
    )

    side = int(width * scale)
    art = cv2.resize(art, (side, side))
    framed = cv2.copyMakeBorder(
        art, 14, 14, 14, 14, cv2.BORDER_CONSTANT, value=(30, 30, 30)
    )
    fh, fw = framed.shape[:2]
    x0, y0 = (width - fw) // 2, (height - fh) // 2
    skew = fw * 0.05

    source = np.float32([[0, 0], [fw, 0], [fw, fh], [0, fh]])
    target = np.float32(
        [[x0, y0 + skew], [x0 + fw, y0], [x0 + fw, y0 + fh], [x0, y0 + fh - skew]]
    )
    matrix = cv2.getPerspectiveTransform(source, target)
    warped = cv2.warpPerspective(framed, matrix, (width, height))
    mask = cv2.warpPerspective(np.full((fh, fw), 255, np.uint8), matrix, (width, height))
    wall[mask > 0] = warped[mask > 0]

    return wall


def _phash_similarity(a: np.ndarray, b: np.ndarray) -> float:
    def to_pil(x):
        return Image.fromarray(cv2.cvtColor(x, cv2.COLOR_BGR2RGB))

    return 100 * (1 - (imagehash.phash(to_pil(a)) - imagehash.phash(to_pil(b))) / 64)


class GeometricCopyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.art = _artwork()

    def signal_for(self, candidate: np.ndarray) -> tuple[str, float]:
        orb = compare_orb(self.art, candidate)
        similarity = _phash_similarity(self.art, candidate)
        signal, _ = classify_match(
            watermark_verified=False,
            phash_similarity_percent=similarity,
            good_matches=orb.good_matches,
            homography_inliers=orb.homography_inliers,
            inlier_ratio_percent=orb.inlier_ratio_percent,
        )

        return signal, similarity

    def test_framed_mockup_is_a_strong_match_despite_a_low_phash(self) -> None:
        signal, similarity = self.signal_for(_mockup(self.art))

        self.assertLess(similarity, 75.0)
        self.assertEqual(signal, "STRONG_VISUAL_MATCH")

    def test_small_mockup_is_still_found(self) -> None:
        signal, _ = self.signal_for(_mockup(self.art, scale=0.25))

        self.assertIn(signal, ("STRONG_VISUAL_MATCH", "POSSIBLE_VISUAL_MATCH"))

    def test_cropped_copy_is_found(self) -> None:
        cropped = self.art[60:420, 60:420]
        signal, _ = self.signal_for(cropped)

        self.assertIn(signal, ("STRONG_VISUAL_MATCH", "POSSIBLE_VISUAL_MATCH"))

    def test_unrelated_artwork_is_not_a_match(self) -> None:
        signal, _ = self.signal_for(_artwork(seed=99))

        self.assertIn(signal, ("NO_STRONG_VISUAL_MATCH", "WEAK_VISUAL_SIGNAL"))

    def test_unrelated_artwork_in_a_mockup_is_not_a_match(self) -> None:
        signal, _ = self.signal_for(_mockup(_artwork(seed=99)))

        self.assertIn(signal, ("NO_STRONG_VISUAL_MATCH", "WEAK_VISUAL_SIGNAL"))


class GeometricRuleTests(unittest.TestCase):
    def test_thresholds(self) -> None:
        self.assertTrue(is_geometric_copy(25, 50.0))
        self.assertTrue(is_geometric_copy(600, 99.0))
        self.assertFalse(is_geometric_copy(24, 90.0))
        self.assertFalse(is_geometric_copy(100, 49.0))
        self.assertFalse(is_geometric_copy(100, None))
        self.assertFalse(is_geometric_copy(4, 100.0))


if __name__ == "__main__":
    unittest.main()
