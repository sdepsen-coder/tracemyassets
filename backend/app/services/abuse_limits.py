"""
Limits that stop one person (or script) from opening many accounts or
guessing passwords. They are counted from the activity log
(models.user_event), so they need no extra tables and always agree with
what the admin pages show.

A visitor whose address is unknown (no IP recorded) is never limited by
address; the per-email limit on failed sign-ins still applies.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user_event import UserEvent
from app.services import user_events

SIGNUP_WINDOW = timedelta(hours=24)
LOGIN_WINDOW = timedelta(minutes=15)
RESET_WINDOW = timedelta(hours=1)
MAX_RESET_REQUESTS_PER_IP_PER_HOUR = 10


def _count(
    db: Session,
    *,
    event_types: tuple[str, ...],
    window: timedelta,
    ip: str | None = None,
    email: str | None = None,
) -> int:
    since = datetime.now(timezone.utc) - window

    stmt = select(func.count(UserEvent.id)).where(
        UserEvent.event_type.in_(event_types),
        UserEvent.created_at >= since,
    )

    if ip is not None:
        stmt = stmt.where(UserEvent.ip_address == ip)

    if email is not None:
        stmt = stmt.where(UserEvent.email == email)

    return int(db.scalar(stmt) or 0)


def check_signup_allowed(db: Session, request: Request) -> None:
    limit = settings.max_signups_per_ip_per_day
    ip = user_events.client_ip(request)

    if limit <= 0 or ip is None:
        return

    created = _count(
        db,
        event_types=(user_events.REGISTER, user_events.GOOGLE_SIGNUP),
        window=SIGNUP_WINDOW,
        ip=ip,
    )

    if created >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Too many accounts have been created from your network "
                "today. Please try again tomorrow."
            ),
        )


def check_login_allowed(
    db: Session, request: Request, email: str
) -> None:
    per_email = settings.max_failed_logins_per_email
    per_ip = settings.max_failed_logins_per_ip
    ip = user_events.client_ip(request)

    too_many = (
        per_email > 0
        and _count(
            db,
            event_types=(user_events.LOGIN_FAILED,),
            window=LOGIN_WINDOW,
            email=email,
        )
        >= per_email
    ) or (
        per_ip > 0
        and ip is not None
        and _count(
            db,
            event_types=(user_events.LOGIN_FAILED,),
            window=LOGIN_WINDOW,
            ip=ip,
        )
        >= per_ip
    )

    if too_many:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Too many failed sign-in attempts. Please wait 15 "
                "minutes and try again."
            ),
        )


def reset_requests_limited(db: Session, request: Request) -> bool:
    """Too many password-reset requests from one address this hour."""
    ip = user_events.client_ip(request)

    if ip is None:
        return False

    return (
        _count(
            db,
            event_types=(user_events.PASSWORD_RESET_REQUESTED,),
            window=RESET_WINDOW,
            ip=ip,
        )
        >= MAX_RESET_REQUESTS_PER_IP_PER_HOUR
    )
