"""
Etsy Open API v3 discovery provider.

Selected via VISUAL_SEARCH_PROVIDER=etsy, alone or combined with other
providers (e.g. VISUAL_SEARCH_PROVIDER=google-vision,rainforest-amazon,etsy)
-- see app.services.visual_search_provider.get_configured_providers.
This class itself has no FastAPI/endpoint wiring of its own.

Etsy's v3 API supports public active-listing search
(GET /v3/application/listings/active) with only an API key -- no
seller registration, no OAuth, no approval gate. Confirmed against
Etsy's own published API reference, and against a real third-party
integration built around exactly this (pipeworx-io/mcp-etsy, described
as "public listing search via Etsy Open API v3 (api_key auth only)").

Search is by keyword (the asset's title) -- Etsy has no
image-similarity search of its own, the same limitation as Amazon/
Rainforest. This only ever supplies *candidate locations*; every
candidate is still re-verified through our own pHash/watermark/ORB
pipeline (app.services.visual_verification.verify_candidate_image)
exactly like every other provider -- this class never computes a
similarity score or watermark verdict itself.

Setup (do this yourself -- Claude does not create accounts or keys):
    1. Register an app at https://www.etsy.com/developers/register --
       this read-only public search needs no OAuth flow and no Etsy
       seller account. The app must be *approved* by Etsy before its
       key works (a pending app gets 403 "API key not found or not
       active, or incorrect shared secret").
    2. Set ETSY_API_KEY in the backend's environment. Etsy's current
       error text refers to a shared secret, so the value may need to
       be "keystring:shared_secret" rather than the bare keystring --
       it is sent as-is in the x-api-key header. Not yet confirmed
       against an approved app; check this first once approved.

Not yet live-tested against Etsy's real API (unlike
rainforest-amazon, which was validated this session with a real
positive-control search against a known listing) -- this is
implemented directly from Etsy's published v3 reference. Run one real
search against a listing you already know exists before relying on
this in production; see claude/deployment-status.md for how the
equivalent Amazon test was done, and do the same here first.
"""

from __future__ import annotations

import os

import httpx

from app.services.visual_search_provider import DiscoveredCandidate

ETSY_SOURCE_NAME = "Etsy listing"
ETSY_ACTIVE_LISTINGS_URL = "https://openapi.etsy.com/v3/application/listings/active"
REQUEST_TIMEOUT_SECONDS = 20.0
DEFAULT_MAX_RESULTS = 20

# Etsy's v3 image objects carry several pre-resized URLs; largest
# first, so a candidate is still usable even if a smaller variant is
# missing for some reason.
IMAGE_URL_FIELDS_LARGEST_FIRST = (
    "url_fullxfull",
    "url_570xN",
    "url_170x135",
    "url_75x75",
)


class EtsyProvider:
    """
    Discovery provider backed by Etsy Open API v3's active-listing
    keyword search, with images embedded via includes=Images so no
    second request is needed per candidate.
    """

    name = "etsy"

    def __init__(
        self,
        api_key: str | None = None,
        max_results: int = DEFAULT_MAX_RESULTS,
    ) -> None:
        self.api_key = api_key or os.getenv("ETSY_API_KEY")

        if not self.api_key:
            raise RuntimeError(
                "ETSY_API_KEY is not set -- required for the etsy "
                "discovery provider."
            )

        self.max_results = max_results

    def find_candidates(
        self,
        *,
        asset_id: int,
        asset_title: str,
        reference_original_path,
        reference_watermarked_path,
    ) -> list[DiscoveredCandidate]:
        search_term = asset_title.strip()

        if not search_term:
            return []

        response = httpx.get(
            ETSY_ACTIVE_LISTINGS_URL,
            params={
                "keywords": search_term,
                "limit": self.max_results,
                "includes": "Images",
            },
            headers={"x-api-key": self.api_key},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )

        if not response.is_success:
            raise RuntimeError(
                f"Etsy API request failed ({response.status_code}): "
                f"{response.text}"
            )

        payload = response.json()
        results = payload.get("results") or []

        candidates: list[DiscoveredCandidate] = []

        for listing in results[: self.max_results]:
            image_url = _first_image_url(listing)

            if not image_url:
                continue

            page_url = listing.get("url")

            # Deliberately NOT the listing's title: Etsy's API Terms
            # (section 1) forbid storing Etsy content beyond reasonable
            # periods and displaying product information more than six
            # hours old. A match record lives indefinitely, so it keeps
            # only the link back to the listing (required by the same
            # terms) plus our own comparison results, never Etsy text.
            candidates.append(
                DiscoveredCandidate(
                    source_name=ETSY_SOURCE_NAME,
                    source_url=page_url,
                    candidate_image_url=image_url,
                    candidate_page_url=page_url,
                    candidate_image_bytes=None,  # scan pipeline fetches it
                )
            )

        return candidates


def _first_image_url(listing: dict) -> str | None:
    """
    Etsy's v3 API only embeds each listing's images under an "images"
    key when the request asked for includes=Images (as this provider
    always does). Each image entry carries several resized URLs --
    take the largest one available rather than assuming a fixed key is
    always present.
    """
    images = listing.get("images") or []

    if not images:
        return None

    first_image = images[0]

    for field in IMAGE_URL_FIELDS_LARGEST_FIRST:
        url = first_image.get(field)

        if url:
            return url

    return None
