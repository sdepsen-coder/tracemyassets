"""
Minimal transactional email sender (Resend HTTP API).

Sending is best-effort: it never raises, so an email problem can never
break a scan or the scheduler. With no RESEND_API_KEY it does nothing.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("tracemyassets.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"
SEND_TIMEOUT_SECONDS = 10.0


def email_enabled() -> bool:
    return bool(settings.resend_api_key)


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    text: str,
) -> bool:
    """Returns True only when the provider accepted the message."""
    if not email_enabled():
        logger.info("Email not sent (RESEND_API_KEY is not set).")
        return False

    try:
        response = httpx.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": settings.email_from,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text,
            },
            timeout=SEND_TIMEOUT_SECONDS,
        )
    except httpx.HTTPError:
        logger.exception("Email request failed.")
        return False

    if response.status_code >= 300:
        logger.warning(
            "Email provider rejected the message: HTTP %s %s",
            response.status_code,
            response.text[:200],
        )
        return False

    return True
