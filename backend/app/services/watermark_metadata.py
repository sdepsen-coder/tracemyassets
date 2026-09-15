from pathlib import Path

from PIL import Image
from PIL.PngImagePlugin import PngInfo

from app.services.watermark import (
    WatermarkResult,
    extract_watermark,
)


def save_verified_watermarked_png(
    result: WatermarkResult,
    output_path: Path,
    *,
    secret: bytes,
    original_phash: str | None,
) -> None:
    """
    Save metadata and verify the watermark in the actual saved PNG.

    The caller owns result.image and handles cleanup if saving fails.
    Metadata is a public lookup hint, not proof of ownership.
    """
    fields: dict[str, str] = {
        "TraceMyAssets.AssetRef": f"tma:v1:{result.payload.nonce}",
        "TraceMyAssets.FormatVersion": "1",
    }

    if original_phash:
        fields["TraceMyAssets.OriginalPHash"] = original_phash

    metadata = PngInfo()

    for key, value in fields.items():
        metadata.add_text(key, value)

    result.image.save(
        output_path,
        format="PNG",
        pnginfo=metadata,
    )

    with Image.open(output_path) as saved_image:
        saved_image.load()

        for key, expected_value in fields.items():
            if saved_image.info.get(key) != expected_value:
                raise RuntimeError(
                    "Saved PNG metadata verification failed."
                )

        decoded_payload = extract_watermark(
            saved_image,
            secret=secret,
        )

        if decoded_payload != result.payload:
            raise RuntimeError(
                "Saved PNG watermark verification failed."
            )