"""
Short-lived signed links to an artwork's protected copy.

Deep scan asks a third-party search service (via SerpApi, Google Lens) to
look for an image, and that service has to be able to *download* the
image. It cannot sign in, so it gets a link that works for a few minutes
and for one artwork only; after that the link is dead.

The signature is an HMAC over the artwork id and the expiry time, keyed
from AUTH_SECRET_KEY under a purpose label so it can never be mistaken
for (or used as) a login token. Nothing is stored: the link is checked by
recomputing the signature.
"""

from __future__ import annotations

import hashlib
import hmac
import time

from app.core.config import settings
from app.core.security import get_auth_secret

LINK_TTL_SECONDS = 10 * 60
PURPOSE = b"tracemyassets/public-asset-image/v1"


def _key() -> bytes:
    return hmac.new(
        get_auth_secret().encode("utf-8"),
        PURPOSE,
        hashlib.sha256,
    ).digest()


def sign(asset_id: int, expires_at: int) -> str:
    message = f"{asset_id}:{expires_at}".encode("ascii")

    return hmac.new(_key(), message, hashlib.sha256).hexdigest()


def is_valid(
    asset_id: int,
    expires_at: int,
    signature: str,
    *,
    now: float | None = None,
) -> bool:
    """True only for an unexpired link whose signature is genuine."""
    current = time.time() if now is None else now

    if expires_at < current:
        return False

    # Also refuse links claiming an absurdly distant expiry, so a leaked
    # key could not be used to mint effectively permanent links silently.
    if expires_at > current + LINK_TTL_SECONDS + 60:
        return False

    return hmac.compare_digest(sign(asset_id, expires_at), signature)


def build_public_image_url(
    asset_id: int,
    *,
    now: float | None = None,
) -> str:
    """
    The address SerpApi/Google can fetch the artwork's protected copy
    from, valid for LINK_TTL_SECONDS. Needs PUBLIC_BACKEND_URL.
    """
    base = settings.public_backend_url

    if not base:
        raise RuntimeError(
            "PUBLIC_BACKEND_URL is not set, so deep scan cannot give the "
            "search service a link to the image."
        )

    current = time.time() if now is None else now
    expires_at = int(current) + LINK_TTL_SECONDS
    signature = sign(asset_id, expires_at)

    return (
        f"{base}/api/v1/public/asset-image/"
        f"{asset_id}/{expires_at}/{signature}.png"
    )
