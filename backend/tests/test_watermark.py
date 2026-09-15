import unittest
from io import BytesIO

import numpy as np
from PIL import Image

from app.services.watermark import (
    WatermarkCapacityError,
    WatermarkError,
    WatermarkQualityError,
    WatermarkResult,
    embed_watermark,
    extract_watermark,
    generate_phash,
)


class WatermarkTests(unittest.TestCase):
    def setUp(self) -> None:
        # Public deterministic key for tests only.
        self.secret = bytes(range(32))

        y, x = np.indices((512, 512), dtype=np.uint16)

        pixels = np.stack(
            (
                48 + x // 4,
                64 + y // 4,
                80 + (x + y) // 8,
            ),
            axis=-1,
        ).astype(np.uint8)

        self.image = Image.fromarray(pixels)
        self.addCleanup(self.image.close)

    def _embed(self) -> WatermarkResult:
        result = embed_watermark(
            self.image,
            asset_id=101,
            user_id=7,
            secret=self.secret,
            timestamp=1_700_000_000,
        )
        self.addCleanup(result.image.close)
        return result

    def test_png_round_trip(self) -> None:
        result = self._embed()

        with BytesIO() as stream:
            result.image.save(stream, format="PNG")
            stream.seek(0)

            with Image.open(stream) as reopened:
                decoded = extract_watermark(
                    reopened,
                    secret=self.secret,
                )

        self.assertEqual(decoded, result.payload)
        self.assertEqual(result.payload.asset_id, 101)
        self.assertEqual(result.payload.user_id, 7)
        self.assertEqual(result.payload.timestamp, 1_700_000_000)
        self.assertGreaterEqual(result.psnr_db, 40.0)

    def test_input_image_is_not_modified(self) -> None:
        original = np.array(self.image)
        self._embed()

        np.testing.assert_array_equal(
            np.array(self.image),
            original,
        )

    def test_wrong_secret_is_rejected(self) -> None:
        result = self._embed()

        decoded = extract_watermark(
            result.image,
            secret=b"x" * 32,
        )

        self.assertIsNone(decoded)

    def test_unmarked_image_has_no_payload(self) -> None:
        self.assertIsNone(
            extract_watermark(
                self.image,
                secret=self.secret,
            )
        )

    def test_small_image_is_rejected(self) -> None:
        with Image.new("RGB", (128, 128), "gray") as small:
            with self.assertRaises(WatermarkCapacityError):
                embed_watermark(
                    small,
                    asset_id=1,
                    user_id=1,
                    secret=self.secret,
                )

    def test_fully_transparent_image_is_rejected(self) -> None:
        with Image.new(
            "RGBA",
            (512, 512),
            (0, 0, 0, 0),
        ) as transparent:
            with self.assertRaises(WatermarkCapacityError):
                embed_watermark(
                    transparent,
                    asset_id=1,
                    user_id=1,
                    secret=self.secret,
                )

    def test_alpha_and_nonopaque_pixels_are_preserved(self) -> None:
        with self.image.convert("RGBA") as rgba:
            pixels = np.array(rgba)

        pixels[:, :64, 3] = 0
        pixels[:, -64:, 3] = 128

        with Image.fromarray(pixels) as source:
            result = embed_watermark(
                source,
                asset_id=2,
                user_id=7,
                secret=self.secret,
            )

        self.addCleanup(result.image.close)
        output = np.array(result.image)

        np.testing.assert_array_equal(
            output[..., 3],
            pixels[..., 3],
        )

        nonopaque = pixels[..., 3] < 255

        np.testing.assert_array_equal(
            output[nonopaque],
            pixels[nonopaque],
        )

        self.assertEqual(
            extract_watermark(result.image, secret=self.secret),
            result.payload,
        )

    def test_weak_secret_is_rejected(self) -> None:
        with self.assertRaises(WatermarkError):
            embed_watermark(
                self.image,
                asset_id=1,
                user_id=1,
                secret=b"short",
            )

    def test_quality_limit_is_enforced(self) -> None:
        with self.assertRaises(WatermarkQualityError):
            embed_watermark(
                self.image,
                asset_id=1,
                user_id=1,
                secret=self.secret,
                min_psnr_db=100.0,
            )

    def test_phash_format(self) -> None:
        value = generate_phash(self.image)

        self.assertEqual(len(value), 16)
        self.assertEqual(value, generate_phash(self.image))
        int(value, 16)


if __name__ == "__main__":
    unittest.main()