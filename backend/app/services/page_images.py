"""
Find the artwork-sized images a web page shows.

Search engines sometimes report "this page contains a matching image"
without saying which image. To still check such a page, we read it and
pull out its main images -- the social-preview image first, then
structured-data images, then ordinary <img> tags -- and compare each with
the reference through the normal verification pipeline. This module only
finds candidate image addresses; it never decides whether one matches.
"""

from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

from app.services.page_check import PageFetcher, PageStatus, fetch_page

DEFAULT_IMAGES_PER_PAGE = 3

_SKIP_WORDS = re.compile(
    r"logo|icon|sprite|avatar|favicon|pixel|tracking|badge|banner|button|"
    r"placeholder|blank",
    re.IGNORECASE,
)
_SKIP_EXTENSIONS = (".svg", ".gif", ".ico")
_SRCSET_ENTRY = re.compile(r"\s*(\S+)(?:\s+(\d+(?:\.\d+)?)[wx])?\s*(?:,|$)")

_PRIORITY_META = 0
_PRIORITY_JSON_LD = 1
_PRIORITY_IMG = 2


class _ImageCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.found: list[tuple[int, str]] = []
        self._in_json_ld = False
        self._json_ld_buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        attributes = {name: (value or "") for name, value in attrs}

        if tag == "meta":
            key = (
                attributes.get("property") or attributes.get("name") or ""
            ).lower()

            if key in (
                "og:image",
                "og:image:url",
                "og:image:secure_url",
                "twitter:image",
                "twitter:image:src",
            ) or attributes.get("itemprop", "").lower() == "image":
                content = attributes.get("content", "")

                if content:
                    self.found.append((_PRIORITY_META, content))
        elif tag == "link":
            if attributes.get("rel", "").lower() == "image_src":
                href = attributes.get("href", "")

                if href:
                    self.found.append((_PRIORITY_META, href))
        elif tag == "script":
            if "ld+json" in attributes.get("type", "").lower():
                self._in_json_ld = True
                self._json_ld_buffer = []
        elif tag == "img":
            for name in ("src", "data-src", "data-original", "data-lazy-src"):
                if attributes.get(name):
                    self.found.append((_PRIORITY_IMG, attributes[name]))

            srcset = attributes.get("srcset") or attributes.get(
                "data-srcset", ""
            )
            best = _largest_srcset_entry(srcset)

            if best:
                self.found.append((_PRIORITY_IMG, best))

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._json_ld_buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_json_ld:
            self._in_json_ld = False

            try:
                document = json.loads("".join(self._json_ld_buffer))
            except ValueError:
                return

            for url in _json_ld_images(document):
                self.found.append((_PRIORITY_JSON_LD, url))


def _largest_srcset_entry(srcset: str) -> str | None:
    best_url: str | None = None
    best_size = -1.0

    for match in _SRCSET_ENTRY.finditer(srcset or ""):
        url, size = match.group(1), match.group(2)

        if not url:
            continue

        value = float(size) if size else 0.0

        if value >= best_size:
            best_url, best_size = url, value

    return best_url


def _json_ld_images(node) -> list[str]:
    urls: list[str] = []

    if isinstance(node, dict):
        image = node.get("image")

        if isinstance(image, str):
            urls.append(image)
        elif isinstance(image, dict) and isinstance(image.get("url"), str):
            urls.append(image["url"])
        elif isinstance(image, list):
            for item in image:
                urls.extend(_json_ld_images({"image": item}))

        for value in node.values():
            if isinstance(value, (dict, list)):
                urls.extend(_json_ld_images(value))
    elif isinstance(node, list):
        for item in node:
            urls.extend(_json_ld_images(item))

    return urls


def extract_image_urls(
    html: str,
    base_url: str,
    *,
    limit: int = DEFAULT_IMAGES_PER_PAGE,
) -> list[str]:
    """Up to `limit` absolute image URLs from a page, best candidates first."""
    collector = _ImageCollector()

    try:
        collector.feed(html)
    except Exception:  # noqa: BLE001 - malformed HTML must never abort a scan
        pass

    ordered = sorted(collector.found, key=lambda item: item[0])
    seen: set[str] = set()
    urls: list[str] = []

    for _, raw in ordered:
        absolute = urljoin(base_url, raw.strip())
        parsed = urlparse(absolute)

        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            continue

        path = parsed.path.lower()

        if path.endswith(_SKIP_EXTENSIONS) or _SKIP_WORDS.search(path):
            continue

        if absolute in seen:
            continue

        seen.add(absolute)
        urls.append(absolute)

        if len(urls) >= limit:
            break

    return urls


def read_page_images(
    page_url: str,
    *,
    limit: int = DEFAULT_IMAGES_PER_PAGE,
    fetcher: PageFetcher | None = None,
) -> tuple[PageStatus | None, list[str]]:
    """
    Returns (failure_status, image_urls). failure_status is None when the
    page was read; GONE / BLOCKED say why it could not be.
    """
    failure, html = fetch_page(page_url, fetcher=fetcher)

    if failure is not None:
        return failure, []

    return None, extract_image_urls(html, page_url, limit=limit)
