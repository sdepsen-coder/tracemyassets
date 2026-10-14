"""
Error reporting (Sentry), off unless SENTRY_DSN is set.

Only crashes and logged errors are sent. Nothing personal is attached:
no cookies, no IP address, no request bodies, no user names or emails.
Query strings and the headers that carry credentials are removed too,
because a signed image link or a reset token can sit in a URL.
"""

from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger("tracemyassets")

_DROP_HEADERS = {"authorization", "cookie", "set-cookie", "x-api-key"}


def scrub_event(event: dict, hint: dict | None = None) -> dict:
    request = event.get("request")

    if isinstance(request, dict):
        request.pop("data", None)
        request.pop("cookies", None)
        request.pop("query_string", None)

        url = request.get("url")

        if isinstance(url, str) and "?" in url:
            request["url"] = url.split("?", 1)[0]

        headers = request.get("headers")

        if isinstance(headers, dict):
            request["headers"] = {
                key: value
                for key, value in headers.items()
                if key.lower() not in _DROP_HEADERS
            }

    event.pop("user", None)

    return event


def init_monitoring() -> bool:
    """Start Sentry when a DSN is configured. Returns whether it started."""
    dsn = settings.sentry_dsn

    if not dsn:
        return False

    try:
        import sentry_sdk
    except ImportError:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed.")
        return False

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.environment,
        send_default_pii=False,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        before_send=scrub_event,
    )

    logger.info("Error reporting is on.")

    return True
