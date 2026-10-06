"""
The activity log behind the admin pages.

record_event never raises: a logging problem must not break signing in or
scanning. It commits on its own, so call it only at a point where it is
safe to commit what the request has done so far (after the request's own
commit, or before an error is raised).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user_event import UserEvent

logger = logging.getLogger("tracemyassets.events")

REGISTER = "register"
LOGIN = "login"
LOGIN_FAILED = "login_failed"
GOOGLE_SIGNUP = "google_signup"
GOOGLE_LOGIN = "google_login"
PASSWORD_RESET_REQUESTED = "password_reset_requested"
PASSWORD_RESET_DONE = "password_reset_done"
LOGOUT_ALL = "logout_all"
ASSET_UPLOADED = "asset_uploaded"
SCAN = "scan"
DEEP_SCAN = "deep_scan"
FEEDBACK = "feedback"
ADMIN_ACTION = "admin_action"
EMAIL_VERIFIED = "email_verified"
SESSION_RENEWED = "session_renewed"

# Events that mean "this person just got in".
SIGN_IN_EVENTS = (LOGIN, GOOGLE_LOGIN, GOOGLE_SIGNUP, REGISTER)

# Events that show a person is using the app (as opposed to things done
# to or about their account).
ACTIVITY_EVENTS = (
    LOGIN,
    GOOGLE_LOGIN,
    GOOGLE_SIGNUP,
    REGISTER,
    SESSION_RENEWED,
    ASSET_UPLOADED,
    SCAN,
    DEEP_SCAN,
    FEEDBACK,
    PASSWORD_RESET_DONE,
)

MAX_USER_AGENT = 300
MAX_DETAIL = 500


def client_ip(request: Request | None) -> str | None:
    """
    The visitor's address. X-Forwarded-For lists every hop; the proxies we
    run append the address they saw, so the visitor is the entry
    TRUSTED_PROXY_HOPS from the right. Anything a visitor writes into the
    header sits further left and is ignored.
    """
    if request is None:
        return None

    forwarded = request.headers.get("x-forwarded-for", "")
    hops = [part.strip() for part in forwarded.split(",") if part.strip()]
    wanted = settings.trusted_proxy_hops

    if hops and wanted > 0:
        index = max(len(hops) - wanted, 0)
        return hops[index][:64]

    if request.client is not None:
        return request.client.host[:64]

    return None


def record_event(
    db: Session,
    request: Request | None,
    event_type: str,
    *,
    user_id: int | None = None,
    email: str | None = None,
    detail: str | None = None,
) -> None:
    try:
        agent = request.headers.get("user-agent") if request else None

        db.add(
            UserEvent(
                event_type=event_type,
                user_id=user_id,
                email=email.strip().lower()[:255] if email else None,
                ip_address=client_ip(request),
                user_agent=agent[:MAX_USER_AGENT] if agent else None,
                detail=detail[:MAX_DETAIL] if detail else None,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not record %s event.", event_type)


def purge_old_events(db: Session, *, now: datetime | None = None) -> int:
    """Delete events older than the retention period. Returns the count."""
    current = now or datetime.now(timezone.utc)
    cutoff = current - timedelta(days=settings.event_retention_days)

    result = db.execute(
        delete(UserEvent).where(UserEvent.created_at < cutoff)
    )
    db.commit()

    return int(result.rowcount or 0)
