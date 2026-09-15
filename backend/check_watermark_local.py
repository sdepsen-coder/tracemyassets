from __future__ import annotations

import argparse
import sys
from contextlib import suppress
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4
import secrets

from PIL import Image

from app.services.asset_ingestion import (
    UploadValidationError,
    ingest_image,
)
from app.services.watermark import (
    WatermarkError,
    WatermarkResult,
    WatermarkVerificationError,
    embed_watermark,
    extract_watermark,
    generate_phash,
)


OUTPUT_ROOT = (
    Path(__file__).resolve().parent
    / "storage"
    / "watermark_checks"
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check watermark round-trip on a local image."
    )
    parser.add_argument("image", type=Path)
    args = parser.parse_args()

    # This key exists only during this test run.
    # Never use these output files as production registered assets.
    secret = secrets.token_bytes(32)

    result: WatermarkResult | None = None
    output_path: Path | None = None
    created_output = False

    try:
        source_path = args.image.expanduser().resolve(strict=True)

        with TemporaryDirectory(prefix="tma-watermark-check-") as temporary:
            # Reuse the existing upload size and image validation.
            with source_path.open("rb") as source:
                stored = ingest_image(
                    source,
                    storage_root=Path(temporary),
                )

            with Image.open(stored.original_path) as original:
                result = embed_watermark(
                    original,
                    asset_id=1,
                    user_id=1,
                    secret=secret,
                )
                original_phash = generate_phash(original)

            OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
            output_path = OUTPUT_ROOT / f"{uuid4().hex}.png"

            with output_path.open("xb") as output:
                created_output = True
                result.image.save(output, format="PNG")

            with Image.open(output_path) as reopened:
                recovered = extract_watermark(
                    reopened,
                    secret=secret,
                )
                output_phash = generate_phash(reopened)

            if recovered != result.payload:
                raise WatermarkVerificationError(
                    "The saved PNG did not recover the expected payload."
                )

            distance = (
                int(original_phash, 16) ^ int(output_phash, 16)
            ).bit_count()

            print("PNG round-trip: PASS")
            print(f"Output dimensions: {result.image.size}")
            print(f"PSNR over opaque RGB pixels: {result.psnr_db:.2f} dB")
            print(f"pHash Hamming distance: {distance}/64")
            print(f"Test output: {output_path}")
            print("The original file was not modified.")
            print(
                "TEST ONLY: synthetic IDs and an ephemeral key were used. "
                "The key is not saved; do not publish this as a registered asset."
            )

        return 0

    except (WatermarkError, UploadValidationError, OSError) as exc:
        if created_output and output_path is not None:
            with suppress(OSError):
                output_path.unlink(missing_ok=True)

        print(f"Check failed: {exc}", file=sys.stderr)
        return 1

    finally:
        if result is not None:
            result.image.close()


if __name__ == "__main__":
    raise SystemExit(main())