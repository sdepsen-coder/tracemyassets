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


class NearIdenticalHashTests(unittest.TestCase):
    """Real log values: small Pinterest thumbnails of the artwork."""

    def _signal(self, phash, good, inliers, ratio):
        return classify_match(
            watermark_verified=False,
            phash_similarity_percent=phash,
            good_matches=good,
            homography_inliers=inliers,
            inlier_ratio_percent=ratio,
        )[0]

    def test_a_97_percent_thumbnail_with_19_inliers_is_strong(self) -> None:
        self.assertEqual(
            self._signal(97.0, 22, 19, 86.4), "STRONG_VISUAL_MATCH"
        )

    def test_a_97_percent_thumbnail_with_12_inliers_is_strong(self) -> None:
        self.assertEqual(
            self._signal(97.0, 17, 12, 70.6), "STRONG_VISUAL_MATCH"
        )

    def test_the_91_percent_thumbnail_stays_strong(self) -> None:
        self.assertEqual(
            self._signal(90.6, 32, 27, 84.4), "STRONG_VISUAL_MATCH"
        )

    def test_a_near_identical_hash_still_needs_geometric_support(self) -> None:
        self.assertNotEqual(
            self._signal(97.0, 3, 4, 100.0), "STRONG_VISUAL_MATCH"
        )
        self.assertNotEqual(
            self._signal(97.0, 20, 11, 90.0), "STRONG_VISUAL_MATCH"
        )
        self.assertNotEqual(
            self._signal(97.0, 20, 15, 55.0), "STRONG_VISUAL_MATCH"
        )

    def test_a_lower_hash_does_not_get_the_relaxed_rule(self) -> None:
        # 94 % with 15 inliers is not enough for "strong".
        self.assertNotEqual(
            self._signal(94.0, 20, 15, 90.0), "STRONG_VISUAL_MATCH"
        )

    def test_unrelated_images_in_the_real_log_stay_unmatched(self) -> None:
        for phash, good, inliers, ratio in (
            (50.0, 2, 0, None),
            (56.0, 4, 4, 100.0),
            (53.0, 8, 4, 50.0),
            (59.0, 6, 4, 66.7),
            (50.0, 19, 9, 47.4),
        ):
            self.assertNotIn(
                self._signal(phash, good, inliers, ratio),
                ("STRONG_VISUAL_MATCH", "POSSIBLE_VISUAL_MATCH"),
            )


if __name__ == "__main__":
    unittest.main()
