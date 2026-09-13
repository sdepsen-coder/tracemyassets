from __future__ import annotations

import shutil
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

import imagehash
from PIL import Image, ImageOps, UnidentifiedImageError


MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
CHUNK_BYTES = 1024 * 1024

ALLOWED_FORMATS = {
    "PNG": (".png", "image/png"),
    "JPEG": (".jpg", "image/jpeg"),
    "WEBP": (".webp", "image/webp"),
}

# Private local storage. Do not mount this directory publicly.
DEFAULT_STORAGE_ROOT = (
    Path(__file__).resolve().parents[2] / "storage" / "assets"
)


class UploadValidationError(ValueError):
    """The uploaded file does not meet ingestion requirements."""


@dataclass(frozen=True)
class StoredImage:
    storage_key: str
    original_path: Path
    thumbnail_path: Path
    media_type: str
    file_size: int
    width: int
    height: int
    color_mode: str
    phash_value: str


def _copy_limited(source: BinaryIO, destination: Path) -> int:
    total = 0

    with destination.open("xb") as output:
        while True:
            chunk = source.read(CHUNK_BYTES)
            if not chunk:
                break

            total += len(chunk)
            if total > MAX_UPLOAD_BYTES:
                raise UploadValidationError(
                    "File size must not exceed 25 MiB."
                )

            output.write(chunk)

    if total == 0:
        raise UploadValidationError("The uploaded file is empty.")

    return total


def _validate_image(path: Path) -> str:
    # Trust the decoded image format, not the filename or client MIME type.
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)

            with Image.open(path) as image:
                image_format = image.format

                if image_format not in ALLOWED_FORMATS:
                    raise UploadValidationError(
                        "Only PNG, JPEG and WEBP images are supported."
                    )

                width, height = image.size
                if width * height > MAX_IMAGE_PIXELS:
                    raise UploadValidationError(
                        "Image resolution must not exceed 25 megapixels."
                    )

                if getattr(image, "is_animated", False):
                    raise UploadValidationError(
                        "Animated images are not supported in this MVP."
                    )

                image.verify()

                return image_format

    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise UploadValidationError(
            "The image exceeds safe decoding limits."
        ) from exc
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise UploadValidationError(
            "The file is not a valid supported image."
        ) from exc


def ingest_image(
    source: BinaryIO,
    *,
    storage_root: Path = DEFAULT_STORAGE_ROOT,
) -> StoredImage:
    """
    Validate an image, preserve the original, generate a thumbnail and pHash.

    Does not create a database record or embed a watermark.
    The caller is responsible for authentication and ownership.
    """
    storage_root.mkdir(parents=True, exist_ok=True)

    storage_key = uuid4().hex
    asset_directory = storage_root / storage_key
    asset_directory.mkdir(exist_ok=False)

    temporary_path = asset_directory / "upload.tmp"

    try:
        file_size = _copy_limited(source, temporary_path)
        image_format = _validate_image(temporary_path)
        extension, media_type = ALLOWED_FORMATS[image_format]

        thumbnail_path = asset_directory / "thumbnail.png"

        try:
            with Image.open(temporary_path) as image:
                image.load()

                width, height = image.size
                color_mode = image.mode

                # Respect EXIF orientation for matching and thumbnail display.
                oriented = ImageOps.exif_transpose(image)

                try:
                    with oriented.convert("RGB") as rgb:
                        phash_value = str(imagehash.phash(rgb, hash_size=8))

                    has_alpha = (
                        "A" in oriented.getbands()
                        or "transparency" in oriented.info
                    )

                    with oriented.convert(
                        "RGBA" if has_alpha else "RGB"
                    ) as thumbnail:
                        thumbnail.thumbnail(
                            (480, 480),
                            Image.Resampling.LANCZOS,
                        )
                        # Avoid carrying EXIF/text metadata into thumbnails.
                        thumbnail.info.clear()
                        thumbnail.save(thumbnail_path, format="PNG")
                finally:
                    oriented.close()

        except (UnidentifiedImageError, OSError, SyntaxError) as exc:
            raise UploadValidationError(
                "The image could not be fully decoded or processed."
            ) from exc

        original_path = asset_directory / f"original{extension}"
        temporary_path.rename(original_path)

        return StoredImage(
            storage_key=storage_key,
            original_path=original_path,
            thumbnail_path=thumbnail_path,
            media_type=media_type,
            file_size=file_size,
            width=width,
            height=height,
            color_mode=color_mode,
            phash_value=phash_value,
        )

    except Exception:
        # Remove partial files if validation or processing fails.
        shutil.rmtree(asset_directory, ignore_errors=True)
        raise