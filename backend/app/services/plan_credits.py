"""
Monthly Deep scan credits for paid plans.

A paid subscription adds its plan's monthly credits once per month
counted from the day the subscription started -- on a yearly plan too
(monthly, not all at once). The month's credits are granted the first time
anything looks at the balance, or when Paddle reports the subscription, so
no scheduler is needed.

Monthly credits do not carry over: when a new month's credits are added,
what is left of the previous month's grant is taken away first. Credits
that were not from a plan (welcome, by hand, bought later) are never
touched, because only the unused part of the last plan grant can expire.

Everything is idempotent: a month's grant is keyed by (subscription,
month number), and (user_id, grant_key) is unique in the ledger.
"""

from __future__ import annotations

import calendar
import hashlib
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.plan_limits import get_plan_limits
from app.models.credit_entry import CreditEntry
from app.models.paddle import PaddleSubscription

ACCESS_STATUSES = {"active", "trialing", "past_due"}


def add_months(start: datetime, months: int) -> datetime:
    """Calendar months later, clamping the day (31 Jan + 1 -> 28/29 Feb)."""
    index = start.month - 1 + months
    year = start.year + index // 12
    month = index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])

    return start.replace(year=year, month=month, day=day)


def months_elapsed(start: datetime, now: datetime) -> int:
    """How many whole months have passed since `start` (0 in the first)."""
    months = (now.year - start.year) * 12 + (now.month - start.month)

    while months > 0 and add_months(start, months) > now:
        months -= 1

    return max(months, 0)


def _key(prefix: str, subscription_id: str, month: int) -> str:
    digest = hashlib.sha1(f"{subscription_id}:{month}".encode()).hexdigest()

    return f"{prefix}:{digest[:30]}"


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def grant_due_plan_credits(
    db: Session,
    user_id: int,
    *,
    now: datetime | None = None,
) -> int:
    """
    Add this month's plan credits if they are due and not yet given.
    Returns the number of credits added. Does not commit (the caller does).
    """
    current = now or datetime.now(timezone.utc)
    added = 0

    subscriptions = list(
        db.scalars(
            select(PaddleSubscription).where(
                PaddleSubscription.user_id == user_id,
                PaddleSubscription.status.in_(ACCESS_STATUSES),
            )
        )
    )

    # Someone who ended up with more than one subscription (two checkouts)
    # still gets one plan's credits: the highest plan, the oldest first.
    rank = {"Pro": 1, "Extra": 2}
    subscriptions = [
        item
        for item in subscriptions
        if item.started_at is not None and item.plan in rank
    ]
    subscriptions.sort(
        key=lambda item: (-rank[item.plan], _aware(item.started_at))
    )

    for subscription in subscriptions[:1]:

        if (
            subscription.scheduled_action == "cancel"
            and subscription.scheduled_at is not None
            and _aware(subscription.scheduled_at) <= current
        ):
            continue

        amount = get_plan_limits(subscription.plan).monthly_deep_scan_credits

        if amount <= 0:
            continue

        month = months_elapsed(_aware(subscription.started_at), current)
        grant_key = _key("pg", subscription.subscription_id, month)

        already = db.execute(
            select(CreditEntry.id).where(
                CreditEntry.user_id == user_id,
                CreditEntry.grant_key == grant_key,
            )
        ).first()

        if already is not None:
            continue

        # Take away what is left of the previous plan grant.
        previous = db.execute(
            select(CreditEntry.id, CreditEntry.delta)
            .where(
                CreditEntry.user_id == user_id,
                CreditEntry.reason == "plan",
            )
            .order_by(CreditEntry.id.desc())
            .limit(1)
        ).first()

        expired = 0

        if previous is not None:
            previous_id, previous_amount = previous

            spent = -int(
                db.execute(
                    select(func.coalesce(func.sum(CreditEntry.delta), 0)).where(
                        CreditEntry.user_id == user_id,
                        CreditEntry.id > previous_id,
                        CreditEntry.reason.in_(("deep_scan", "refund")),
                    )
                ).scalar_one()
            )
            balance = int(
                db.execute(
                    select(func.coalesce(func.sum(CreditEntry.delta), 0)).where(
                        CreditEntry.user_id == user_id
                    )
                ).scalar_one()
            )
            expired = max(
                0, min(previous_amount - max(spent, 0), balance)
            )

        try:
            with db.begin_nested():
                if expired > 0:
                    db.add(
                        CreditEntry(
                            user_id=user_id,
                            delta=-expired,
                            reason="expiry",
                            grant_key=_key("px", subscription.subscription_id, month),
                            note="Unused monthly plan credits expired",
                        )
                    )

                db.add(
                    CreditEntry(
                        user_id=user_id,
                        delta=amount,
                        reason="plan",
                        grant_key=grant_key,
                        note=f"{subscription.plan} monthly credits",
                    )
                )
        except IntegrityError:
            continue

        added += amount

    return added
