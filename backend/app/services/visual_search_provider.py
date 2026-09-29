from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import httpx

MAX_CANDIDATE_FETCH_BYTES = 25 * 1024 * 1024
CANDIDATE_FETCH_TIMEOUT_SECONDS = 10.0
SOURCE_NAME_MAX_LENGTH = 100  # matches MatchRecord.source_name's column width


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
        reference_original_path: Path,
        reference_watermarked_path: Path | None,
    ) -> list[DiscoveredCandidate]: ...


def _build_provider(provider_name: str) -> VisualSearchProvider:
    """
    Instantiate one named provider. Construction failures (a missing
    or invalid API key/credential) are deliberately fail-fast here --
    that is a setup problem, different from a provider that fails at
    *search* time (see run_scan_for_asset._collect_candidates, which
    isolates that case instead so one flaky provider doesn't lose the
    other configured providers' results for the same scan).
    """
    provider_name = provider_name.strip().lower()

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
                "VISUAL_SEARCH_PROVIDER includes google-vision but the "
                "provider could not be initialized -- check "
                "GOOGLE_APPLICATION_CREDENTIALS[_JSON]. "
                f"Details: {exc}"
            ) from exc

    if provider_name == "rainforest-amazon":
        from app.services.rainforest_amazon_visual_search import (
            RainforestAmazonProvider,
        )

        try:
            return RainforestAmazonProvider()
        except Exception as exc:
            raise RuntimeError(
                "VISUAL_SEARCH_PROVIDER includes rainforest-amazon but "
                "the provider could not be initialized -- check "
                "RAINFOREST_API_KEY. "
                f"Details: {exc}"
            ) from exc

    if provider_name == "etsy":
        from app.services.etsy_visual_search import EtsyProvider

        try:
            return EtsyProvider()
        except Exception as exc:
            raise RuntimeError(
                "VISUAL_SEARCH_PROVIDER includes etsy but the provider "
                "could not be initialized -- check ETSY_API_KEY. "
                f"Details: {exc}"
            ) from exc

    raise RuntimeError(
        f"Unknown VISUAL_SEARCH_PROVIDER value: {provider_name!r}"
    )


def get_configured_providers() -> list[VisualSearchProvider]:
    """
    Build every discovery provider named in VISUAL_SEARCH_PROVIDER
    (comma-separated, e.g. "google-vision,rainforest-amazon,etsy").
    Defaults to the fake/demo provider so the app keeps working out of
    the box with no external credentials.

    Every configured provider runs on every scan (see
    run_scan_for_asset); their candidates are pooled into one list
    before our own pHash/watermark/ORB verification. There is no
    separate "source platform" field on a match -- each provider tags
    its own candidates by building a suitable DiscoveredCandidate.
    source_name (e.g. "Amazon (amazon.co.uk): ..." or "Etsy: ...", vs
    Google Web Detection's page title), truncated with
    truncate_source_name() so a long marketplace listing title can
    never fail the database insert.
    """
    from app.core.config import settings

    raw_value = settings.visual_search_provider or "fake"
    names = [item.strip() for item in raw_value.split(",") if item.strip()]

    if not names:
        names = ["fake"]

    return [_build_provider(name) for name in names]


def get_configured_provider() -> VisualSearchProvider:
    """
    Backward-compatible single-provider accessor: returns the first
    provider named in VISUAL_SEARCH_PROVIDER. Prefer
    get_configured_providers() for anything that runs a scan.
    """
    return get_configured_providers()[0]


def truncate_source_name(text: str, limit: int = SOURCE_NAME_MAX_LENGTH) -> str:
    """
    Clip a candidate's human-readable label to fit
    MatchRecord.source_name (String(100)) before it reaches the scan
    pipeline. Marketplace listing titles routinely run past 100
    characters (Amazon's SEO-stuffed titles especially) -- an
    unclipped value would fail the database insert outright, not just
    display truncated, so every provider that builds source_name from
    a listing/page title should pass it through this first.
    """
    text = text.strip()

    if len(text) <= limit:
        return text

    return text[: limit - 1].rstrip() + "…"


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
