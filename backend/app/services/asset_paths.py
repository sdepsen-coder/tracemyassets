"""
Small shared helpers for locating an asset's files on disk and loading
the watermark secret. Extracted out of the HTTP endpoints module so
the background scheduler (app.services.scheduler) can use the exact
same logic without importing from the routes layer.
"""

from __future__ import annotations

import base64
import os
from pathlib import Path

from fastapi import HTTPException, status

from app.models.asset import Asset
from app.services.asset_ingestion import DEFAULT_STORAGE_ROOT


def original_file_path(asset: Asset) -> Path:
    root = DEFAULT_STORAGE_ROOT.resolve()
    path = (root / asset.original_url).resolve()

    if (
        not path.is_relative_to(root)
        or path.name not in {
            "original.png",
            "original.jpg",
            "original.webp",
        }
        or not path.is_file()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset file not found.",
        )

    return path


def asset_storage_directory(asset: Asset) -> Path:
    """
    Resolve the on-disk directory holding one asset's files (original,
    thumbnail, watermarked), without requiring the original file to
    still exist.

    Deliberately more lenient than original_file_path(): it is used
    for best-effort cleanup after a delete, where the file may
    already be missing (e.g. lost to Railway's ephemeral filesystem
    before the persistent volume fix), and a missing file should
    never block deleting the database rows that reference it.
    """
    root = DEFAULT_STORAGE_ROOT.resolve()
    directory = (root / asset.original_url).resolve().parent

    if not directory.is_relative_to(root):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid asset storage reference.",
        )

    return directory


def load_watermark_secret() -> bytes:
    hex_value = os.getenv("WATERMARK_SECRET_HEX")
    b64_value = os.getenv("WATERMARK_SECRET_B64")

    if hex_value:
        return bytes.fromhex(hex_value.strip())

    if b64_value:
        return base64.b64decode(b64_value.strip())

    raise RuntimeError(
        "Missing WATERMARK secret. Set WATERMARK_SECRET_HEX "
        "(recommended) or WATERMARK_SECRET_B64 in your .env"
    )
