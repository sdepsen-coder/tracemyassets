"""
Monthly allowance of hand-started Standard scans, and which accounts are
too inactive to keep scanning automatically.

Both are counted from the activity log (models.user_event): a hand-started
scan writes a "scan" event, and an open session writes a "session_renewed"
event about once a day. Scheduled scans and deep scans do not write "scan"
events, so they never use the allowance.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plan_limits import get_plan_limits
from app.models.user import User
from app.models.user_event import UserEvent
from app.services import user_events


@dataclass(frozen=True)
class ManualScanUsage:
    used: int
    limit: int | None
    resets_on: date

    @property
    def remaining(self) -> int | None:
        if self.limit is None:
            return None

        return max(0, self.limit - self.used)

    @property
    def exhausted(self) -> bool:
        return self.limit is not None and self.used >= self.limit


def _utc(now: datetime | None) -> datetime:
    current = now or datetime.now(timezone.utc)

    if current.tzinfo is None:
        return current.replace(tzinfo=timezone.utc)

    return current.astimezone(timezone.utc)


def month_start(now: datetime | None = None) -> datetime:
    current = _utc(now)

    return current.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )


def next_month_start(now: datetime | None = None) -> datetime:
    start = month_start(now)

    return (start + timedelta(days=32)).replace(day=1)


def get_manual_scan_usage(
    db: Session, user: User, *, now: datetime | None = None
) -> ManualScanUsage:
    limit = get_plan_limits(user.plan_type).manual_scans_per_month

    used = int(
        db.scalar(
            select(func.count(UserEvent.id)).where(
                UserEvent.user_id == user.id,
                UserEvent.event_type == user_events.SCAN,
                UserEvent.created_at >= month_start(now),
            )
        )
        or 0
    )

    return ManualScanUsage(
        used=used,
        limit=limit,
        resets_on=next_month_start(now).date(),
    )


def is_dormant(
    db: Session, user: User, *, now: datetime | None = None
) -> bool:
    """
    A Free account with no sign-in, upload, scan or feedback for
    FREE_DORMANT_DAYS days. Paying and internal accounts never go dormant.
    """
    days = settings.free_dormant_days

    if days <= 0 or user.plan_type != "Free":
        return False

    cutoff = _utc(now) - timedelta(days=days)

    last_active = db.scalar(
        select(func.max(UserEvent.created_at)).where(
            UserEvent.user_id == user.id,
            UserEvent.event_type.in_(user_events.ACTIVITY_EVENTS),
        )
    )

    if last_active is None:
        last_active = user.created_at

    if last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)

    return last_active < cutoff
