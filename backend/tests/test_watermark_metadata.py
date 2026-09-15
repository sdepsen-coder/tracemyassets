import secrets
from pathlib import Path
from typing import Iterator

import pytest
from PIL import Image

from app.services.watermark import (
    WatermarkResult,
    embed_watermark,
    extract_watermark,
    generate_phash,
)
from app.services.watermark_metadata import (
    save_verified_watermarked_png,
)


@pytest.fixture(scope="module")
def watermarked_sample() -> Iterator[
    tuple[WatermarkResult, bytes, str]
]:
    # Synthetic image and temporary key; no real user files or .env.
    secret = secrets.token_bytes(32)

    with Image.new("RGB", (1024, 1024), (128, 128, 128)) as original:
        original_phash = generate_phash(original)

        result = embed_watermark(
            original,
            asset_id=7,
            user_id=1,
            secret=secret,
        )

    try:
        yield result, secret, original_phash
    finally:
        result.image.close()


def test_saved_png_contains_expected_metadata(
    tmp_path: Path,
    watermarked_sample: tuple[WatermarkResult, bytes, str],
) -> None:
    result, secret, original_phash = watermarked_sample
    output_path = tmp_path / "watermarked.png"

    save_verified_watermarked_png(
        result,
        output_path,
        secret=secret,
        original_phash=original_phash,
    )

    with Image.open(output_path) as saved:
        assert saved.info["TraceMyAssets.AssetRef"] == (
            f"tma:v1:{result.payload.nonce}"
        )
        assert saved.info["TraceMyAssets.OriginalPHash"] == (
            original_phash
        )
        assert saved.info["TraceMyAssets.FormatVersion"] == "1"


def test_saved_png_preserves_pixels_and_watermark(
    tmp_path: Path,
    watermarked_sample: tuple[WatermarkResult, bytes, str],
) -> None:
    result, secret, original_phash = watermarked_sample
    output_path = tmp_path / "watermarked.png"

    save_verified_watermarked_png(
        result,
        output_path,
        secret=secret,
        original_phash=original_phash,
    )

    with Image.open(output_path) as saved:
        saved.load()

        # Compare against the already-watermarked image,
        # not the original unwatermarked image.
        assert saved.mode == result.image.mode
        assert saved.size == result.image.size
        assert saved.tobytes() == result.image.tobytes()

        assert extract_watermark(
            saved,
            secret=secret,
        ) == result.payload

        metadata_reference = saved.info["TraceMyAssets.AssetRef"]

    assert metadata_reference == f"tma:v1:{result.payload.nonce}"


def test_missing_optional_phash_is_not_written(
    tmp_path: Path,
    watermarked_sample: tuple[WatermarkResult, bytes, str],
) -> None:
    result, secret, _ = watermarked_sample
    output_path = tmp_path / "without-phash.png"

    save_verified_watermarked_png(
        result,
        output_path,
        secret=secret,
        original_phash=None,
    )

    with Image.open(output_path) as saved:
        assert "TraceMyAssets.OriginalPHash" not in saved.info
        assert saved.info["TraceMyAssets.FormatVersion"] == "1"

        assert extract_watermark(
            saved,
            secret=secret,
        ) == result.payload