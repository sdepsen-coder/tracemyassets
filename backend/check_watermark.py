from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

from dotenv import dotenv_values
from PIL import Image, UnidentifiedImageError

from app.services.watermark import WatermarkError, extract_watermark


ENV_PATH = Path(__file__).resolve().parent / ".env"


def load_watermark_secret() -> bytes:
    """Load the local watermark key without displaying it."""
    env_values = dotenv_values(ENV_PATH)

    hex_value = os.getenv("WATERMARK_SECRET_HEX") or env_values.get(
        "WATERMARK_SECRET_HEX"
    )
    b64_value = os.getenv("WATERMARK_SECRET_B64") or env_values.get(
        "WATERMARK_SECRET_B64"
    )

    try:
        if isinstance(hex_value, str) and hex_value.strip():
            return bytes.fromhex(hex_value.strip())

        if isinstance(b64_value, str) and b64_value.strip():
            return base64.b64decode(b64_value.strip(), validate=True)
    except ValueError as exc:
        raise WatermarkError(
            "WATERMARK_SECRET_HEX or WATERMARK_SECRET_B64 is invalid."
        ) from exc

    raise WatermarkError(
        "Watermark secret is missing. Configure it in backend/.env."
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify a TraceMyAssets watermark in an image."
    )
    parser.add_argument(
        "image",
        type=Path,
        help="Path to a candidate watermarked image.",
    )
    args = parser.parse_args()

    try:
        image_path = args.image.expanduser().resolve(strict=True)
        secret = load_watermark_secret()

        with Image.open(image_path) as image:
            payload = extract_watermark(image, secret=secret)

        print(f"File: {image_path}")

        if payload is None:
            print("Watermark: NOT VERIFIED")
            print(
                "No valid watermark was recovered with the current local key."
            )
            return 1

        print("Watermark: VERIFIED")
        print(f"Asset ID: {payload.asset_id}")
        print(f"User ID: {payload.user_id}")
        print(f"Timestamp (Unix): {payload.timestamp}")
        print(f"Nonce: {payload.nonce}")
        return 0

    except FileNotFoundError:
        print("Check failed: image file was not found.", file=sys.stderr)
        return 2
    except (UnidentifiedImageError, OSError) as exc:
        print(f"Check failed: invalid or unreadable image: {exc}", file=sys.stderr)
        return 2
    except WatermarkError as exc:
        print(f"Check failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())