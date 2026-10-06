"""
Who is behind an email address: the same mailbox can be typed many ways.
"""

from __future__ import annotations

from app.core.config import settings
from app.core.disposable_domains import DISPOSABLE_DOMAINS

GMAIL_DOMAINS = {"gmail.com", "googlemail.com"}


def email_domain(email: str) -> str:
    return email.strip().lower().rpartition("@")[2]


def is_blocked_domain(email: str) -> bool:
    """A throw-away mail service (when blocking is switched on)."""
    if not settings.block_disposable_emails:
        return False

    domain = email_domain(email)

    return domain in DISPOSABLE_DOMAINS or domain in settings.blocked_email_domains


def canonical_email(email: str) -> str:
    """
    The mailbox, ignoring "+tag" parts (any provider) and dots (Gmail
    ignores them). "A.nn+shop@Gmail.com" and "ann@gmail.com" give the same
    result, so one mailbox cannot open many accounts.
    """
    lowered = email.strip().lower()
    local, _, domain = lowered.rpartition("@")

    local = local.split("+", 1)[0]

    if domain in GMAIL_DOMAINS:
        local = local.replace(".", "")
        domain = "gmail.com"

    return f"{local}@{domain}"[:255]
