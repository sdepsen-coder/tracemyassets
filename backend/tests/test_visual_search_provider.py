import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

from app.services.fake_visual_search import FakeVisualSearchProvider
from app.services.watermark import embed_watermark, extract_watermark
from app.services.watermark_metadata import save_verified_watermarked_png
from app.services.visual_verification import verify_candidate_image


class FakeVisualSearchProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.secret = bytes(range(32))
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)

        storage = Path(self.tempdir.name)
        self.original_path = storage / "original.png"
        self.watermarked_path = storage / "watermarked.png"

        y, x = np.indices((512, 512), dtype=np.uint16)
        gradient = np.stack(
            (
                48 + x // 4,
                64 + y // 4,
                80 + (x + y) // 8,
            ),
            axis=-1,
        ).astype(np.uint16)

        # A pure smooth gradient is a degenerate case for pHash: many of
        # its DCT coefficients sit near zero, so their relative rank
        # flips under tiny resize/JPEG perturbations and the hash
        # changes far more than a real photo's would. Blending in a
        # deterministic texture keeps the fixture reproducible while
        # behaving like real artwork under resize + recompression.
        texture = np.random.default_rng(0).integers(
            0, 255, size=(512, 512, 3), dtype=np.uint16
        )
        pixels = (
            0.6 * gradient + 0.4 * texture
        ).astype(np.uint8)

        with Image.fromarray(pixels) as reference:
            reference.save(self.original_path, format="PNG")

            result = embed_watermark(
                reference,
                asset_id=101,
                user_id=7,
                secret=self.secret,
            )

        self.addCleanup(result.image.close)

        save_verified_watermarked_png(
            result,
            self.watermarked_path,
            secret=self.secret,
            original_phash=None,
        )

        self.provider = FakeVisualSearchProvider()

    def test_returns_two_candidates_with_real_bytes(self) -> None:
        candidates = self.provider.find_candidates(
            asset_id=101,
            asset_title="Botanical Dreams",
            reference_original_path=self.original_path,
            reference_watermarked_path=self.watermarked_path,
        )

        self.assertEqual(len(candidates), 2)

        for candidate in candidates:
            self.assertIsNotNone(candidate.candidate_image_bytes)
            self.assertIsNone(candidate.candidate_image_url)

    def test_verbatim_candidate_carries_the_real_watermark(self) -> None:
        candidates = self.provider.find_candidates(
            asset_id=101,
            asset_title="Botanical Dreams",
            reference_original_path=self.original_path,
            reference_watermarked_path=self.watermarked_path,
        )

        verbatim = candidates[0]

        # Decode the candidate bytes back to an image and confirm the
        # embedded payload extracts cleanly -- this is what a real scan
        # would rely on to set watermark_matches_reference=True.
        from io import BytesIO

        with Image.open(BytesIO(verbatim.candidate_image_bytes)) as decoded:
            payload = extract_watermark(decoded, secret=self.secret)

        self.assertIsNotNone(payload)
        self.assertEqual(payload.asset_id, 101)
        self.assertEqual(payload.user_id, 7)

    def test_verbatim_candidate_verifies_through_the_real_pipeline(
        self,
    ) -> None:
        candidates = self.provider.find_candidates(
            asset_id=101,
            asset_title="Botanical Dreams",
            reference_original_path=self.original_path,
            reference_watermarked_path=self.watermarked_path,
        )

        result = verify_candidate_image(
            reference_path=self.original_path,
            reference_phash=None,
            expected_asset_id=101,
            expected_user_id=7,
            candidate_content=candidates[0].candidate_image_bytes,
            watermark_secret=self.secret,
        )

        self.assertTrue(result.watermark_matches_reference)
        self.assertEqual(result.overall_signal, "WATERMARK_VERIFIED")

    def test_transformed_candidate_still_flags_high_similarity(
        self,
    ) -> None:
        candidates = self.provider.find_candidates(
            asset_id=101,
            asset_title="Botanical Dreams",
            reference_original_path=self.original_path,
            reference_watermarked_path=self.watermarked_path,
        )

        transformed = candidates[1]

        result = verify_candidate_image(
            reference_path=self.original_path,
            reference_phash=None,
            expected_asset_id=101,
            expected_user_id=7,
            candidate_content=transformed.candidate_image_bytes,
            watermark_secret=self.secret,
        )

        # A resized, JPEG-recompressed copy of the *original* (never
        # watermarked) should still register a strong pHash similarity,
        # but must not falsely claim a watermark match.
        self.assertGreaterEqual(result.phash_similarity_percent, 80.0)
        self.assertFalse(result.watermark_matches_reference)

    def test_missing_watermarked_copy_still_returns_one_candidate(
        self,
    ) -> None:
        candidates = self.provider.find_candidates(
            asset_id=202,
            asset_title="No watermark yet",
            reference_original_path=self.original_path,
            reference_watermarked_path=None,
        )

        self.assertEqual(len(candidates), 1)
        self.assertIsNotNone(candidates[0].candidate_image_bytes)


if __name__ == "__main__":
    unittest.main()
