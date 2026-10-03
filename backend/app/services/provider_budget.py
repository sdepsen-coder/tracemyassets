"""
Spending guard for paid discovery providers.

Every billable call is recorded (ProviderUsage) *before* it is made, and
refused once the daily or monthly allowance is used up, so the app stops
before the provider's plan does and nobody is ever surprised by a bill.

Counted per calendar day / month in UTC. The limits come from the
provider's plan (see app.core.config); they are our own count, so if the
provider counts differently, set the limits a little lower.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.provider_usage import ProviderUsage


class ProviderBudgetExceeded(Exception):
    """Raised instead of making a call that would exceed an allowance."""

    def __init__(self, provider: str, period: str) -> None:
        self.provider = provider
        self.period = period  # "daily" or "monthly"

        super().__init__(
            f"{provider} {period} allowance is used up."
        )


@dataclass(frozen=True)
class BudgetStatus:
    used_today: int
    used_this_month: int
    daily_limit: int
    monthly_limit: int

    @property
    def remaining_today(self) -> int:
        return max(0, self.daily_limit - self.used_today)

    @property
    def remaining_this_month(self) -> int:
        return max(0, self.monthly_limit - self.used_this_month)

    def blocked_period(self, units: int = 1) -> str | None:
        """Which allowance would stop `units` more calls, if any."""
        if self.remaining_today < units:
            return "daily"

        if self.remaining_this_month < units:
            return "monthly"

        return None


def _utc(now: datetime | None) -> datetime:
    current = now or datetime.now(timezone.utc)

    if current.tzinfo is None:
        return current.replace(tzinfo=timezone.utc)

    return current.astimezone(timezone.utc)


def _units_since(
    db: Session,
    provider: str,
    since: datetime,
) -> int:
    return int(
        db.scalar(
            select(func.coalesce(func.sum(ProviderUsage.units), 0)).where(
                ProviderUsage.provider == provider,
                ProviderUsage.created_at >= since,
            )
        )
        or 0
    )


def get_budget_status(
    db: Session,
    provider: str,
    *,
    daily_limit: int,
    monthly_limit: int,
    now: datetime | None = None,
) -> BudgetStatus:
    current = _utc(now)
    day_start = current.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = day_start.replace(day=1)

    return BudgetStatus(
        used_today=_units_since(db, provider, day_start),
        used_this_month=_units_since(db, provider, month_start),
        daily_limit=daily_limit,
        monthly_limit=monthly_limit,
    )


def reserve_units(
    db: Session,
    provider: str,
    units: int = 1,
    *,
    daily_limit: int,
    monthly_limit: int,
    asset_id: int | None = None,
    now: datetime | None = None,
) -> None:
    """
    Record `units` calls to a provider, or raise ProviderBudgetExceeded
    without recording anything if that would pass an allowance.

    Commits on its own: the spend must stay on record even if the scan
    that caused it later fails and rolls back, because the provider
    charges for the call either way. Call it with a short-lived session
    of its own, not the request's.
    """
    status = get_budget_status(
        db,
        provider,
        daily_limit=daily_limit,
        monthly_limit=monthly_limit,
        now=now,
    )

    period = status.blocked_period(units)

    if period is not None:
        raise ProviderBudgetExceeded(provider, period)

    db.add(
        ProviderUsage(
            provider=provider,
            units=units,
            asset_id=asset_id,
            # The same moment the allowance was checked against.
            created_at=_utc(now),
        )
    )
    db.commit()
