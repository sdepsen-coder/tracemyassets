"""
What the invisible watermark survives, measured.

The public Help and landing pages quote this table, so each expectation
below pins the observed result, failures included. If watermark.py is ever
made more robust, these tests fail on purpose: update docs/test-results.md
and the site copy with the new numbers in the same change.

Images are synthetic "paintings" (shapes plus blur), not real artwork, so
treat the result as a guide, not a guarantee for every picture.
"""

from __future__ import annotations

import unittest
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, ImageEnhance

from app.services.watermark import embed_watermark, extract_watermark

SECRET = bytes(range(32))
ASSET_ID = 101
USER_ID = 7
SEEDS = (3, 5, 8)


def _artwork(seed: int, size: int = 1000) -> Image.Image:
    rng = np.random.default_rng(seed)
    image = np.full((size, size, 3), 235, np.uint8)

    for _ in range(260):
        colour = tuple(int(v) for v in rng.integers(20, 240, 3))
        centre = tuple(int(v) for v in rng.integers(0, size, 2))

        if rng.random() < 0.5:
            cv2.circle(image, centre, int(rng.integers(8, 70)), colour, -1)
        else:
            corner = (
                min(size - 1, centre[0] + int(rng.integers(10, 120))),
                min(size - 1, centre[1] + int(rng.integers(10, 120))),
            )
            cv2.rectangle(image, centre, corner, colour, -1)

    image = cv2.GaussianBlur(image, (0, 0), 1.5)

    return Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))


def _reencode(image: Image.Image, fmt: str, **options) -> Image.Image:
    stream = BytesIO()
    image.save(stream, format=fmt, **options)
    stream.seek(0)
    out = Image.open(stream)
    out.load()

    return out


def _resize(image: Image.Image, factor: float) -> Image.Image:
    return image.resize(
        (int(image.width * factor), int(image.height * factor)),
        Image.LANCZOS,
    )


def _crop_centre(image: Image.Image, fraction: float) -> Image.Image:
    w, h = image.size
    cw, ch = int(w * fraction), int(h * fraction)
    x, y = (w - cw) // 2, (h - ch) // 2

    return image.crop((x, y, x + cw, y + ch))


def _crop_off_grid(image: Image.Image, fraction: float) -> Image.Image:
    """A crop whose corner is not a multiple of the 8 px watermark block."""
    w, h = image.size

    return image.crop((3, 5, 3 + int(w * fraction), 5 + int(h * fraction)))


# name -> (edit, does the watermark still read back?)
EDITS: dict[str, tuple] = {
    "PNG (lossless)": (lambda i: _reencode(i, "PNG"), True),
    "WEBP lossless": (lambda i: _reencode(i, "WEBP", lossless=True), True),
    "JPEG quality 95": (lambda i: _reencode(i, "JPEG", quality=95), True),
    "JPEG quality 85": (lambda i: _reencode(i, "JPEG", quality=85), True),
    "JPEG quality 70": (lambda i: _reencode(i, "JPEG", quality=70), False),
    "JPEG quality 50": (lambda i: _reencode(i, "JPEG", quality=50), False),
    "WEBP quality 90": (lambda i: _reencode(i, "WEBP", quality=90), True),
    "WEBP quality 75": (lambda i: _reencode(i, "WEBP", quality=75), False),
    "Resize to 75%": (lambda i: _resize(i, 0.75), False),
    "Resize to 50%": (lambda i: _resize(i, 0.5), False),
    "Resize to 25%": (lambda i: _resize(i, 0.25), False),
    "Enlarge 2x": (lambda i: _resize(i, 2.0), False),
    "Crop to 90% (centred)": (lambda i: _crop_centre(i, 0.9), False),
    "Crop to 90% (off the block grid)": (lambda i: _crop_off_grid(i, 0.9), False),
    "Crop to 50% (centred)": (lambda i: _crop_centre(i, 0.5), False),
    "Rotate 1 degree": (lambda i: i.rotate(1, resample=Image.BICUBIC), False),
    "Rotate 90 degrees": (lambda i: i.rotate(90, expand=True), False),
    "Mirror": (lambda i: i.transpose(Image.FLIP_LEFT_RIGHT), False),
    "Brightness +20%": (lambda i: ImageEnhance.Brightness(i).enhance(1.2), False),
    "Contrast +20%": (lambda i: ImageEnhance.Contrast(i).enhance(1.2), True),
    "Black and white": (lambda i: i.convert("L").convert("RGB"), True),
    "Screenshot-like (50% + JPEG 80)": (
        lambda i: _reencode(_resize(i, 0.5), "JPEG", quality=80),
        False,
    ),
}


def measure() -> dict[str, list[bool]]:
    """For every edit: did the watermark read back, once per test image."""
    outcomes: dict[str, list[bool]] = {name: [] for name in EDITS}

    for seed in SEEDS:
        original = _artwork(seed)
        marked = embed_watermark(
            original,
            asset_id=ASSET_ID,
            user_id=USER_ID,
            secret=SECRET,
            timestamp=1_700_000_000,
        ).image

        for name, (edit, _expected) in EDITS.items():
            payload = extract_watermark(edit(marked), secret=SECRET)
            outcomes[name].append(
                payload is not None
                and payload.asset_id == ASSET_ID
                and payload.user_id == USER_ID
            )

    return outcomes


class WatermarkRobustnessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.outcomes = measure()

    def test_each_edit_matches_the_published_result(self) -> None:
        for name, (_edit, expected) in EDITS.items():
            with self.subTest(edit=name):
                self.assertEqual(
                    self.outcomes[name],
                    [expected] * len(SEEDS),
                    f"{name}: expected the watermark to "
                    f"{'survive' if expected else 'be lost'} on every "
                    "test image. If this changed on purpose, update "
                    "docs/test-results.md and the site copy.",
                )

    def test_an_unedited_copy_always_reads_back(self) -> None:
        self.assertTrue(all(self.outcomes["PNG (lossless)"]))


if __name__ == "__main__":
    for edit_name, results in measure().items():
        print(f"{edit_name:36s} {sum(results)}/{len(results)}")
