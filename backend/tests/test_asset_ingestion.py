import unittest
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from PIL import Image

from app.services.asset_ingestion import (
    UploadValidationError,
    ingest_image,
)


class AssetIngestionTests(unittest.TestCase):
    def setUp(self):
        self.temp_directory = TemporaryDirectory()
        self.addCleanup(self.temp_directory.cleanup)
        self.storage_root = Path(self.temp_directory.name)

    def make_image(self, image_format="PNG"):
        buffer = BytesIO()

        with Image.new("RGB", (800, 600), color="navy") as image:
            image.save(buffer, format=image_format)

        buffer.seek(0)
        return buffer

    def test_supported_formats_are_stored(self):
        for image_format in ("PNG", "JPEG", "WEBP"):
            with self.subTest(image_format=image_format):
                source = self.make_image(image_format)
                original_bytes = source.getvalue()

                result = ingest_image(
                    source,
                    storage_root=self.storage_root,
                )

                self.assertEqual(
                    result.original_path.read_bytes(),
                    original_bytes,
                )
                self.assertTrue(result.thumbnail_path.exists())
                self.assertEqual(result.file_size, len(original_bytes))
                self.assertEqual((result.width, result.height), (800, 600))
                self.assertEqual(len(result.phash_value), 16)
                int(result.phash_value, 16)

                with Image.open(result.thumbnail_path) as thumbnail:
                    self.assertLessEqual(max(thumbnail.size), 480)

    def test_invalid_file_is_rejected_and_cleaned_up(self):
        with self.assertRaises(UploadValidationError):
            ingest_image(
                BytesIO(b"this is not an image"),
                storage_root=self.storage_root,
            )

        self.assertEqual(list(self.storage_root.iterdir()), [])

    def test_empty_file_is_rejected(self):
        with self.assertRaises(UploadValidationError):
            ingest_image(
                BytesIO(),
                storage_root=self.storage_root,
            )

        self.assertEqual(list(self.storage_root.iterdir()), [])

    def test_oversized_file_is_rejected_and_cleaned_up(self):
        with patch(
            "app.services.asset_ingestion.MAX_UPLOAD_BYTES",
            10,
        ):
            with self.assertRaises(UploadValidationError):
                ingest_image(
                    BytesIO(b"x" * 11),
                    storage_root=self.storage_root,
                )

        self.assertEqual(list(self.storage_root.iterdir()), [])

    def test_unsupported_format_is_rejected(self):
        with self.assertRaises(UploadValidationError):
            ingest_image(
                self.make_image("GIF"),
                storage_root=self.storage_root,
            )

        self.assertEqual(list(self.storage_root.iterdir()), [])

    def test_excessive_resolution_is_rejected(self):
        with patch(
            "app.services.asset_ingestion.MAX_IMAGE_PIXELS",
            100,
        ):
            with self.assertRaises(UploadValidationError):
                ingest_image(
                    self.make_image(),
                    storage_root=self.storage_root,
                )

        self.assertEqual(list(self.storage_root.iterdir()), [])


if __name__ == "__main__":
    unittest.main()