"""
Deep-scan discovery provider: Google Lens "exact matches" through
SerpApi.

It only *discovers* where a similar image might be; like every provider
it never decides similarity itself -- each candidate is re-verified by our
own pHash / watermark / ORB pipeline (see scan_runner).

Not part of the ordinary scan: it costs real money per search, so it is
never built from VISUAL_SEARCH_PROVIDER. It runs only when a deep scan is
asked for (see get_deep_scan_providers) and every search is counted
against the daily and monthly allowance first (see provider_budget).

Field names of SerpApi's google_lens response (exact_matches[].link /
title / image / thumbnail) were taken from its documentation and are read
defensively. The first live deep scan showed that most results carry no
full-size "image", so the smaller "thumbnail" is used when that is all
there is: it is the same picture at a lower resolution, which our hash
comparison handles. Every search logs which fields the results carried
(field names and counts only, never addresses), the quickest way to see
if the response shape ever changes.
"""

from __future__ import annotations

import base64
import binascii
import logging
import re
from pathlib import Path
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.provider_budget import reserve_units
from app.services.signed_image_links import build_public_image_url
from app.services.visual_search_provider import (
    DiscoveredCandidate,
    truncate_source_name,
)

logger = logging.getLogger("tracemyassets.serpapi_lens")

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
SEARCH_TIMEOUT_SECONDS = 90.0
BUDGET_KEY = "serpapi"

# Lens can return a hundred or more results; reading and verifying all of
# them is slow and mostly noise, so only the most promising are kept
# (those that already carry an image address come first).
MAX_CANDIDATES = 40

# A thumbnail may arrive inline as a data: address instead of a link.
MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024
_DATA_IMAGE = re.compile(
    r"^data:image/[a-z0-9.+-]+;base64,(?P<payload>[A-Za-z0-9+/=\s]+)$",
    re.IGNORECASE,
)

_PINTEREST_HOST = re.compile(
    r"^(?:[a-z]{2,3}\.)?pinterest\.[a-z.]+$"
)
_ETSY_HOST = re.compile(r"^(?:[a-z]{2,3}\.)?etsy\.com$")
_GOOGLE_HOST = re.compile(r"(^|\.)google\.[a-z.]+$")


class LensSearchError(RuntimeError):
    """
    A failed SerpApi call. The message never contains the request URL,
    because that URL carries the API key and error text ends up in logs.
    """


def host_of(url: str) -> str:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return ""

    return host.removeprefix("www.")


def canonical_page_url(link: str) -> str:
    """
    The same Pinterest pin shows up under many country hosts
    (es.pinterest.com, de.pinterest.com, ...); fold them into one address
    so it becomes one match, not a dozen. Other links are left untouched.
    """
    host = host_of(link)

    if _PINTEREST_HOST.match(host):
        path = urlparse(link).path or "/"

        return f"https://www.pinterest.com{path}"

    return link


def source_label(link: str, title: str) -> str:
    """
    The human-readable name stored on a match. Etsy results get the same
    generic label the Etsy API provider uses (no listing titles kept);
    Pinterest country hosts collapse to one name.
    """
    host = host_of(link)

    if _ETSY_HOST.match(host):
        return "Etsy listing"

    if _PINTEREST_HOST.match(host):
        host = "pinterest.com"

    title = " ".join(title.split())

    return truncate_source_name(f"{host}: {title}" if title else host)


def _is_http_url(value: object) -> bool:
    return isinstance(value, str) and value.lower().startswith(
        ("http://", "https://")
    )


def _own_hosts() -> set[str]:
    hosts: set[str] = set()

    for address in (settings.public_backend_url, settings.frontend_url):
        host = host_of(address) if address else ""

        if host:
            hosts.add(host)

    return hosts


def _inline_image_bytes(value: object) -> bytes | None:
    """The picture inside a data:image/...;base64 address, if it is one."""
    if not isinstance(value, str) or len(value) > MAX_INLINE_IMAGE_BYTES * 2:
        return None

    found = _DATA_IMAGE.match(value.strip())

    if found is None:
        return None

    try:
        content = base64.b64decode(
            re.sub(r"\s+", "", found.group("payload")), validate=True
        )
    except (binascii.Error, ValueError):
        return None

    if not content or len(content) > MAX_INLINE_IMAGE_BYTES:
        return None

    return content


def parse_exact_matches(data: dict) -> list[DiscoveredCandidate]:
    """
    Turn a SerpApi google_lens response into candidates: one per page,
    skipping Google's own pages and our own servers, Pinterest country
    duplicates folded together, items with an image address first.
    """
    own_hosts = _own_hosts()
    seen_pages: set[str] = set()
    with_image: list[DiscoveredCandidate] = []
    without_image: list[DiscoveredCandidate] = []

    for item in data.get("exact_matches") or []:
        if not isinstance(item, dict):
            continue

        link = item.get("link")

        if not _is_http_url(link):
            continue

        host = host_of(link)

        if not host or _GOOGLE_HOST.search(host) or host in own_hosts:
            continue

        page_url = canonical_page_url(link)

        if page_url in seen_pages:
            continue

        seen_pages.add(page_url)

        # The full-size image if there is one, else the thumbnail (a link,
        # or a picture sent inline).
        image_url = None
        image_bytes = None

        for field in ("image", "thumbnail"):
            value = item.get(field)

            if _is_http_url(value):
                image_url = value
                break

            inline = _inline_image_bytes(value)

            if inline is not None:
                image_bytes = inline
                break

        title = item.get("title")

        candidate = DiscoveredCandidate(
            source_name=source_label(
                page_url, title if isinstance(title, str) else ""
            ),
            source_url=page_url,
            candidate_image_url=image_url,
            candidate_image_bytes=image_bytes,
            candidate_page_url=page_url,
            # Lens reports pages from a search index, so the scan checks
            # the page is still there and really shows the image.
            page_may_be_stale=True,
        )

        has_image = (
            candidate.candidate_image_url is not None
            or candidate.candidate_image_bytes is not None
        )

        (with_image if has_image else without_image).append(candidate)

    return (with_image + without_image)[:MAX_CANDIDATES]


class SerpApiLensProvider:
    name = "serpapi-lens"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        client: httpx.Client | None = None,
        session_factory=SessionLocal,
    ) -> None:
        self._api_key = (api_key or settings.serpapi_api_key).strip()

        if not self._api_key:
            raise RuntimeError("SERPAPI_API_KEY is not set.")

        self._client = client
        self._session_factory = session_factory

    def _reserve_search(self, asset_id: int) -> None:
        """Count this search against the allowance, or raise."""
        db: Session = self._session_factory()

        try:
            reserve_units(
                db,
                BUDGET_KEY,
                1,
                daily_limit=settings.serpapi_daily_limit,
                monthly_limit=settings.serpapi_monthly_limit,
                asset_id=asset_id,
            )
        finally:
            db.close()

    def _get(self, image_url: str) -> dict:
        params = {
            "engine": "google_lens",
            "type": "exact_matches",
            "url": image_url,
            "api_key": self._api_key,
        }

        owns_client = self._client is None
        client = self._client or httpx.Client()

        try:
            response = client.get(
                SERPAPI_ENDPOINT,
                params=params,
                timeout=SEARCH_TIMEOUT_SECONDS,
            )
            response.raise_for_status()

            return response.json()
        except httpx.HTTPStatusError as exc:
            # `from None`: the chained exception's text contains the URL
            # (and so the API key), and tracebacks print the chain.
            raise LensSearchError(
                f"SerpApi answered HTTP {exc.response.status_code}."
            ) from None
        except (httpx.HTTPError, ValueError) as exc:
            raise LensSearchError(
                f"The SerpApi request failed ({type(exc).__name__})."
            ) from None
        finally:
            if owns_client:
                client.close()

    def find_candidates(
        self,
        *,
        asset_id: int,
        asset_title: str,
        reference_original_path: Path,
        reference_watermarked_path: Path | None,
    ) -> list[DiscoveredCandidate]:
        # The artwork is not uploaded anywhere: SerpApi/Google fetch it
        # from a signed link that expires in minutes. The file served is
        # chosen by that endpoint (the protected copy when there is one),
        # so the paths are not needed here.
        image_url = build_public_image_url(asset_id)

        self._reserve_search(asset_id)

        data = self._get(image_url)

        error = data.get("error")

        if isinstance(error, str) and error:
            if "hasn't returned any results" in error:
                logger.info(
                    "Lens returned no results for asset_id=%s.", asset_id
                )
                return []

            raise LensSearchError(f"SerpApi reported an error: {error}")

        candidates = parse_exact_matches(data)

        raw_items = [
            item
            for item in data.get("exact_matches") or []
            if isinstance(item, dict)
        ]
        field_counts = sorted(
            (name, sum(1 for item in raw_items if item.get(name)))
            for name in {key for item in raw_items for key in item}
        )

        logger.info(
            "Lens exact matches for asset_id=%s: %s raw, %s kept, "
            "%s with a picture to compare. Fields present (name:count): %s",
            asset_id,
            len(raw_items),
            len(candidates),
            sum(
                1
                for item in candidates
                if item.candidate_image_url or item.candidate_image_bytes
            ),
            ", ".join(f"{name}:{count}" for name, count in field_counts)
            or "none",
        )

        return candidates
