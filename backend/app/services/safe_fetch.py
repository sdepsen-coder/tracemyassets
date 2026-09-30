"""
Fetch third-party URLs without letting them reach our own network.

Candidate and page URLs come from search results, i.e. from strangers.
A hostile result could point at localhost, a cloud metadata address or a
private service (for example the database on Railway's private network),
so every request -- and every redirect hop -- is checked to resolve only
to public addresses before anything is sent.

Known limit: the address is resolved once for the check and again by the
HTTP client, so a DNS-rebinding attacker with a very short TTL could in
theory slip through. This closes the practical holes (direct private
URLs, redirects into private ranges, non-HTTP schemes) rather than every
theoretical one.
"""

from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import httpx

DEFAULT_USER_AGENT = "TraceMyAssetsBot/1.0 (+https://tracemyassets.com/support)"
MAX_REDIRECTS = 4


class UnsafeUrlError(Exception):
    """The URL is not a plain http(s) URL to a public address."""


class ResponseTooLarge(Exception):
    """The response body exceeded the allowed size."""


@dataclass(frozen=True)
class FetchResult:
    status_code: int
    content: bytes
    final_url: str


def assert_public_http_url(url: str) -> None:
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise UnsafeUrlError(f"Unsupported URL: {url!r}")

    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    # gaierror (name does not resolve) propagates to the caller on purpose:
    # for a page check that means the site is gone.
    addresses = socket.getaddrinfo(
        parsed.hostname, port, type=socket.SOCK_STREAM
    )

    for info in addresses:
        address = ipaddress.ip_address(info[4][0])

        if getattr(address, "ipv4_mapped", None) is not None:
            address = address.ipv4_mapped

        if not address.is_global:
            raise UnsafeUrlError(
                f"{parsed.hostname} resolves to a non-public address."
            )


def fetch_public(
    url: str,
    *,
    max_bytes: int,
    timeout: float,
    truncate: bool = False,
    max_redirects: int = MAX_REDIRECTS,
    headers: dict[str, str] | None = None,
) -> FetchResult:
    """
    GET a public URL, following redirects manually so each hop is
    validated. The final response is returned whatever its status code;
    the caller decides what a 404 or 403 means.

    A body larger than max_bytes raises ResponseTooLarge, unless
    truncate=True, in which case the first max_bytes are returned.
    """
    request_headers = {"User-Agent": DEFAULT_USER_AGENT}
    request_headers.update(headers or {})

    current = url

    with httpx.Client(follow_redirects=False, timeout=timeout) as client:
        for _ in range(max_redirects + 1):
            assert_public_http_url(current)

            with client.stream(
                "GET", current, headers=request_headers
            ) as response:
                if response.is_redirect and "location" in response.headers:
                    current = urljoin(current, response.headers["location"])
                    continue

                chunks: list[bytes] = []
                total = 0

                for chunk in response.iter_bytes():
                    total += len(chunk)

                    if total > max_bytes:
                        if not truncate:
                            raise ResponseTooLarge(current)

                        chunks.append(chunk[: max_bytes - (total - len(chunk))])
                        break

                    chunks.append(chunk)

                return FetchResult(
                    status_code=response.status_code,
                    content=b"".join(chunks),
                    final_url=current,
                )

    raise UnsafeUrlError(f"Too many redirects for {url!r}")
