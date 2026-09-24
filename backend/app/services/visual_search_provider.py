from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import httpx

MAX_CANDIDATE_FETCH_BYTES = 25 * 1024 * 1024
CANDIDATE_FETCH_TIMEOUT_SECONDS = 10.0


@dataclass(frozen=True)
class DiscoveredCandidate:
    """
    A candidate image location returned by a discovery provider.

    Discovery only identifies *where* a possibly similar image might be.
    It never carries similarity, watermark, or review-signal data -- that
    verdict always comes from our own verification pipeline (see
    app.services.visual_verification.verify_candidate_image), never from
    the provider itself. This keeps every match record backed by the
    same analysis we already trust for manual candidate checks.
    """

    source_name: str
    source_url: str | None
    candidate_image_url: str | None
    candidate_page_url: str | None
    candidate_image_bytes: bytes | None = None
    """
    Optional in-memory image bytes for this candidate.

    Real providers normally leave this as None; the scan pipeline then
    fetches candidate_image_url itself via fetch_candidate_bytes(). Test
    or demo providers may supply bytes directly (for example a
    synthetic image) so the full verification pipeline can be exercised
    without any network access.
    """


class VisualSearchProvider(Protocol):
    """
    Adapter interface for a discovery source.

    A real implementation (e.g. backed by a paid reverse-image-search
    API) only needs to return candidate locations. It must never invent
    its own similarity score or watermark verdict -- see
    DiscoveredCandidate for why.
    """

    name: str

    def find_candidates(
        self,
        *,
        asset_id: int,
        asset_title: str,
    ) -> list[DiscoveredCandidate]: ...


def get_configured_provider() -> VisualSearchProvider:
    """
    Build the discovery provider selected by VISUAL_SEARCH_PROVIDER
    (see app.core.config). Defaults to the fake/demo provider so the
    app keeps working out of the box with no external credentials.
    """
    from app.core.config import settings

    provider_name = (settings.visual_search_provider or "fake").lower()

    if provider_name == "fake":
        from app.services.fake_visual_search import FakeVisualSearchProvider

        return FakeVisualSearchProvider()

    if provider_name == "google-vision":
        from app.services.google_vision_visual_search import (
            GoogleVisionWebDetectionProvider,
        )

        try:
            return GoogleVisionWebDetectionProvider()
        except Exception as exc:
            raise RuntimeError(
                "VISUAL_SEARCH_PROVIDER=google-vision but the provider "
                "could not be initialized -- check "
                "GOOGLE_APPLICATION_CREDENTIALS. "
                f"Details: {exc}"
            ) from exc

    raise RuntimeError(
        f"Unknown VISUAL_SEARCH_PROVIDER value: {provider_name!r}"
    )


def fetch_candidate_bytes(url: str) -> bytes | None:
    """
    Download a candidate image for a real provider's URL.

    Returns None (rather than raising) on any failure -- an
    unreachable, oversized, or non-image candidate should be skipped by
    the scan pipeline, not abort the whole scan job. Enforces the same
    size ceiling as direct uploads (MAX_CANDIDATE_FETCH_BYTES) so a
    hostile or misbehaving source cannot be used to exhaust memory.
    """
    try:
        with httpx.stream(
            "GET",
            url,
            timeout=CANDIDATE_FETCH_TIMEOUT_SECONDS,
            follow_redirects=True,
        ) as response:
            response.raise_for_status()

            chunks: list[bytes] = []
            total = 0

            for chunk in response.iter_bytes():
                total += len(chunk)

                if total > MAX_CANDIDATE_FETCH_BYTES:
                    return None

                chunks.append(chunk)

            return b"".join(chunks)
    except httpx.HTTPError:
        return None
