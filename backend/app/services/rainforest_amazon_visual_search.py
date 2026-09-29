"""
Rainforest API (Traject Data) discovery provider for Amazon.

Selected via VISUAL_SEARCH_PROVIDER=rainforest-amazon, alone or
combined with other providers (e.g.
VISUAL_SEARCH_PROVIDER=google-vision,rainforest-amazon,etsy) -- see
app.services.visual_search_provider.get_configured_providers. This
class itself has no FastAPI/endpoint wiring of its own.

Rainforest is a third-party scraping/parsing service for Amazon's
public search results -- not Amazon's own SP-API. Background on why
this path was chosen over SP-API, and the legal/risk framing (scraping
violates Amazon's Terms of Service but is not a crime in the US after
hiQ v. LinkedIn; a proxy/scraper reduces detection risk, it does not
transfer legal responsibility), lives in claude/deployment-status.md.

Search is by keyword (the asset's title) -- Rainforest has no
image-similarity search of its own, so this only ever supplies
*candidate locations*. Every candidate it returns is still re-verified
through our own pHash/watermark/ORB pipeline
(app.services.visual_verification.verify_candidate_image) exactly like
every other provider; this class never computes a similarity score or
watermark verdict itself.

Validated this session with a real positive-control search using the
founder's own Rainforest API key: searching "Smith Mugs Art Timeline
Mug" against amazon.co.uk found the founder's own known real listing
(ASIN B077V3XGG1) at position #1, with a usable image URL returned
directly in the search response -- no second request needed per
candidate. That test also surfaced a real operational detail: Amazon
(and therefore Rainforest) is split per country domain, so which
domain(s) get searched is a real design choice, not a default to set
once and forget -- see RAINFOREST_AMAZON_DOMAINS below.

Setup (do this yourself -- Claude does not create accounts or keys):
    1. Sign up at https://www.rainforestapi.com and copy the API key
       from the dashboard.
    2. Set RAINFOREST_API_KEY in the backend's environment.
    3. Optionally set RAINFOREST_AMAZON_DOMAINS to a comma-separated
       list of Amazon domains to search (default: "amazon.co.uk",
       matching the founder's own market and the one already
       validated). Each additional domain is a separate Rainforest
       request -- and a separate billed credit -- per scan, so widen
       this deliberately, not by default.

Pricing is real money (see claude/deployment-status.md for the
current tiers) -- get explicit approval before moving off the free
trial onto a paid Rainforest plan, and before raising
RAINFOREST_MAX_RESULTS_PER_DOMAIN or adding domains in a way that
meaningfully changes credit spend.
"""

from __future__ import annotations

import os

import httpx

from app.services.visual_search_provider import (
    DiscoveredCandidate,
    truncate_source_name,
)

RAINFOREST_API_URL = "https://api.rainforestapi.com/request"
REQUEST_TIMEOUT_SECONDS = 20.0
DEFAULT_AMAZON_DOMAINS = "amazon.co.uk"
DEFAULT_MAX_RESULTS_PER_DOMAIN = 10


class RainforestAmazonProvider:
    """
    Discovery provider backed by the Rainforest API's Amazon product
    search (type=search) -- keyword search, not image search. Each
    result already carries a usable image thumbnail URL, so no second
    request is needed per candidate.
    """

    name = "rainforest-amazon"

    def __init__(
        self,
        api_key: str | None = None,
        domains: list[str] | str | None = None,
        max_results_per_domain: int = DEFAULT_MAX_RESULTS_PER_DOMAIN,
    ) -> None:
        self.api_key = api_key or os.getenv("RAINFOREST_API_KEY")

        if not self.api_key:
            raise RuntimeError(
                "RAINFOREST_API_KEY is not set -- required for the "
                "rainforest-amazon discovery provider."
            )

        raw_domains = (
            domains
            if domains is not None
            else os.getenv("RAINFOREST_AMAZON_DOMAINS", DEFAULT_AMAZON_DOMAINS)
        )

        if isinstance(raw_domains, str):
            self.domains = [
                item.strip() for item in raw_domains.split(",") if item.strip()
            ]
        else:
            self.domains = [item.strip() for item in raw_domains if item.strip()]

        if not self.domains:
            self.domains = [DEFAULT_AMAZON_DOMAINS]

        self.max_results_per_domain = max_results_per_domain

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

        candidates: list[DiscoveredCandidate] = []

        for domain in self.domains:
            response = httpx.get(
                RAINFOREST_API_URL,
                params={
                    "api_key": self.api_key,
                    "type": "search",
                    "amazon_domain": domain,
                    "search_term": search_term,
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )

            if not response.is_success:
                raise RuntimeError(
                    f"Rainforest API request failed for domain "
                    f"{domain!r} ({response.status_code}): {response.text}"
                )

            payload = response.json()
            results = payload.get("search_results") or []

            for result in results[: self.max_results_per_domain]:
                image_url = result.get("image")

                if not image_url:
                    # No result_type=="ad"/sponsored placement or
                    # similar edge case with no product image at all
                    # -- nothing our verification pipeline could
                    # compare against.
                    continue

                title = result.get("title") or "Amazon listing"
                page_url = result.get("link")

                candidates.append(
                    DiscoveredCandidate(
                        source_name=truncate_source_name(
                            f"Amazon ({domain}): {title}"
                        ),
                        source_url=page_url,
                        candidate_image_url=image_url,
                        candidate_page_url=page_url,
                        candidate_image_bytes=None,  # scan pipeline fetches it
                    )
                )

        return candidates
