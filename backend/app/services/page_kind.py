"""
What kind of page a match was found on.

The same artwork image can turn up on a page that is *about* it (a
listing or pin whose main item it is) or merely *on* it (a search
result, a category or board page, or a "you may also like" strip). Both
are real appearances, but they are not equal evidence, so each match
carries a coarse page kind that the app can show and order by.

Derived from the page address alone -- nothing is stored.

  item        a single listing / pin / product page
  collection  a search, category, board or shop page
  page        any other page
  image_only  only the image address is known, no page
"""

from __future__ import annotations

from typing import Literal
from urllib.parse import urlsplit

PageKind = Literal["item", "collection", "page", "image_only"]

_ETSY_ITEM = ("/listing/",)
_ETSY_COLLECTION = ("/market/", "/search", "/c/", "/shop/", "/featured/")
_AMAZON_ITEM = ("/dp/", "/gp/product/")
_AMAZON_COLLECTION = ("/s", "/b/", "/stores/")


def _host_is(host: str, domain: str) -> bool:
    return host == domain or host.endswith("." + domain)


def _has(path: str, markers: tuple[str, ...]) -> bool:
    return any(marker in path for marker in markers)


def classify_page(page_url: str | None) -> PageKind:
    if not page_url or not page_url.strip():
        return "image_only"

    try:
        parts = urlsplit(page_url.strip())
    except ValueError:
        return "page"

    host = (parts.hostname or "").lower()
    path = (parts.path or "/").lower()

    if _host_is(host, "etsy.com"):
        if _has(path, _ETSY_ITEM):
            return "item"

        if _has(path, _ETSY_COLLECTION):
            return "collection"

        return "page"

    if "pinterest." in host:
        # Every Pinterest page that is not a single pin (boards,
        # idea/topic pages, profiles, search) is a collection.
        if "/pin/" in path:
            return "item"

        return "collection"

    if "amazon." in host:
        if _has(path, _AMAZON_ITEM):
            return "item"

        if path == "/s" or _has(path, _AMAZON_COLLECTION):
            return "collection"

        return "page"

    return "page"
