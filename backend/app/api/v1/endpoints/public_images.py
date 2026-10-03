"""
The one endpoint that serves an artwork without a login: the signed,
short-lived link handed to the deep-scan search service (see
app.services.signed_image_links).

Every failure -- bad signature, expired link, unknown or archived
artwork, missing file -- answers with the same bare 404, so the endpoint
tells a stranger nothing about which artworks exist.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.asset import Asset
from app.services.asset_paths import original_file_path
from app.services.signed_image_links import is_valid


router = APIRouter(prefix="/public", tags=["public"])

MEDIA_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
}

PUBLIC_IMAGE_HEADERS = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noimageindex",
}


def _not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Not found.",
    )


@router.get("/asset-image/{asset_id}/{expires_at}/{signature}.png")
def read_public_asset_image(
    asset_id: int,
    expires_at: int,
    signature: str,
    db: Session = Depends(get_db),
) -> FileResponse:
    if not is_valid(asset_id, expires_at, signature):
        raise _not_found()

    asset = db.get(Asset, asset_id)

    if asset is None or asset.status != "active":
        raise _not_found()

    try:
        original = original_file_path(asset)
    except HTTPException:
        raise _not_found() from None

    # Prefer the protected (watermarked) copy: a copy that leaks through
    # this link then still carries the proof of origin. Only an artwork
    # that has none falls back to the original.
    watermarked = original.parent / "watermarked.png"
    path = (
        watermarked
        if asset.watermarked_url and watermarked.is_file()
        else original
    )

    return FileResponse(
        path=path,
        media_type=MEDIA_TYPES[path.suffix],
        headers=PUBLIC_IMAGE_HEADERS,
    )
