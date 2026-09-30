"""
Check that the page a search result points to is real and actually
shows the image we matched.

Search engines report pages from an old crawl. By the time we look, the
page may be gone (404), or it may be an unrelated page -- a "similar
images" tool, a catalogue backend, a soft error -- that never displayed
the picture at all. Showing those as matches erodes trust, so a page
must earn its place:

    CONFIRMED    reachable, and its HTML references the matched image
    UNCONFIRMED  reachable, but the image is not in the raw HTML
                 (unrelated page, or content rendered by JavaScript)
    BLOCKED      we could not tell (bot protection, rate limit, server
                 error, timeout) -- not evidence the page is gone
    GONE         404/410 and similar, or the site does not exist

This only ever decides whether a match is worth showing. Whether the
image itself matches is always decided by our own image verification.
"""

from __future__ import annotations

import re
import socket
from enum import Enum
from typing import Callable
from urllib.parse import urlparse

import httpx

from app.services.safe_fetch import (
    FetchResult,
    ResponseTooLarge,
    UnsafeUrlError,
    fetch_public,
)

PAGE_CHECK_TIMEOUT_SECONDS = 8.0
PAGE_CHECK_MAX_BYTES = 1_500_000

# Marketplaces render most of a listing with JavaScript and turn away
# bot traffic, so "image not in the raw HTML" says little about them.
# An unconfirmed page on one of these is still shown; on any other host
# it is dropped.
_TRUSTED_MARKETPLACE_HOST = re.compile(
    r"(^|\.)("
    r"amazon\.(com|co\.uk|com\.au|de|fr|it|es|ca|nl|se|pl|ae|sa|sg|in|"
    r"com\.br|com\.mx|com\.tr|co\.jp|be|eg)|"
    r"etsy\.com|"
    r"ebay\.(com|co\.uk|com\.au|de|fr|it|es|ca|ie|nl|at|ch|pl)|"
    r"aliexpress\.(com|us)|"
    r"temu\.com|walmart\.com|"
    r"pinterest\.(com|co\.uk|com\.au|ca|de|fr|es|it)|"
    r"redbubble\.com|society6\.com|teepublic\.com|myshopify\.com"
    r")$"
)


class PageStatus(str, Enum):
    CONFIRMED = "confirmed"
    UNCONFIRMED = "unconfirmed"
    BLOCKED = "blocked"
    GONE = "gone"


PageFetcher = Callable[[str], FetchResult]


def _default_fetcher(url: str) -> FetchResult:
    return fetch_public(
        url,
        max_bytes=PAGE_CHECK_MAX_BYTES,
        timeout=PAGE_CHECK_TIMEOUT_SECONDS,
        truncate=True,
        headers={"Accept": "text/html,application/xhtml+xml"},
    )


def _image_tokens(image_url: str) -> list[str]:
    """Strings whose presence in a page's HTML suggests it shows the image."""
    parsed = urlparse(image_url)
    tokens: list[str] = []

    if parsed.netloc and parsed.path:
        tokens.append(f"{parsed.netloc}{parsed.path}".lower())

    filename = parsed.path.rsplit("/", 1)[-1]

    if filename:
        # CDN filenames often carry size suffixes ("71AbC._AC_SX679_.jpg"),
        # so the part before the first dot identifies the picture.
        stem = filename.split(".", 1)[0]
        tokens.append((stem if len(stem) >= 8 else filename).lower())

    return [token for token in tokens if token]


def page_references_image(html: str, image_url: str) -> bool:
    haystack = html.lower().replace("\\/", "/").replace("&amp;", "&")

    return any(token in haystack for token in _image_tokens(image_url))


def is_trusted_marketplace(page_url: str) -> bool:
    host = (urlparse(page_url).hostname or "").lower()

    return bool(_TRUSTED_MARKETPLACE_HOST.search(host))


def _response_status(result: FetchResult) -> PageStatus | None:
    """A failure status for an HTTP response, or None if it is a usable 2xx."""
    status = result.status_code

    if status in (404, 410):
        return PageStatus.GONE

    if status in (401, 403, 429) or status >= 500:
        return PageStatus.BLOCKED

    if status >= 400:
        return PageStatus.GONE

    return None


def fetch_page(
    page_url: str,
    *,
    fetcher: PageFetcher | None = None,
) -> tuple[PageStatus | None, str]:
    """
    Fetch a page. Returns (failure_status, html): failure_status is None
    when the page was read successfully, otherwise GONE or BLOCKED.
    """
    fetch = fetcher or _default_fetcher

    try:
        result = fetch(page_url)
    except (UnsafeUrlError, socket.gaierror):
        return PageStatus.GONE, ""
    except httpx.ConnectError:
        return PageStatus.GONE, ""
    except (httpx.HTTPError, ResponseTooLarge):
        return PageStatus.BLOCKED, ""

    failure = _response_status(result)

    if failure is not None:
        return failure, ""

    return None, result.content.decode("utf-8", errors="ignore")


def check_candidate_page(
    page_url: str,
    image_url: str | None,
    *,
    fetcher: PageFetcher | None = None,
) -> PageStatus:
    failure, html = fetch_page(page_url, fetcher=fetcher)

    if failure is not None:
        return failure

    if not image_url:
        return PageStatus.UNCONFIRMED

    if page_references_image(html, image_url):
        return PageStatus.CONFIRMED

    return PageStatus.UNCONFIRMED


def should_show_match(page_url: str, status: PageStatus) -> bool:
    """Policy: which page states are worth showing the user."""
    if status is PageStatus.GONE:
        return False

    if status is PageStatus.UNCONFIRMED:
        return is_trusted_marketplace(page_url)

    return True
