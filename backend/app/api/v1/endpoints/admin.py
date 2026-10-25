"""
Admin pages' API. Everything here needs get_admin_user: someone listed in
ADMIN_EMAILS who signed in with Google recently. Anyone else is told the
page does not exist.

Every change an admin makes is written to the activity log as an
admin_action event, so there is always a record of who changed what.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, distinct, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_db, is_admin_email
from app.core.config import settings
from app.core.plan_limits import PLAN_LIMITS
from app.models.asset import Asset
from app.models.credit_entry import CreditEntry
from app.models.email_verification import VerifiedUser
from app.models.feedback import FeedbackEntry
from app.models.paddle import (
    PaddleAdjustment,
    PaddleSubscription,
    PaddleTransaction,
)
from app.models.scan_job import ScanJob
from app.models.user import User
from app.models.user_event import UserEvent
from app.models.user_suspension import UserSuspension
from app.services import email_verification, paddle_billing, user_events
from app.services.account_deletion import delete_account, remove_folders
from app.services.credits import (
    InsufficientCredits,
    get_balance,
    grant_credits,
    remove_credits,
)
from app.services.paddle_billing import PAID_PLANS, has_access
from app.services.plan_credits import ACCESS_STATUSES
from app.services.provider_budget import get_budget_status
from app.services.session_cutoff import revoke_sessions

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],
)

MAX_PAGE = 200
# Adjustments that give money back, and the one that undoes a chargeback.
MONEY_BACK = ("refund", "chargeback")
MONEY_BACK_UNDONE = ("chargeback_reverse",)

# The users list can be filtered by these subscription states.
SubscriptionFilter = Literal[
    "active", "canceling", "past_due", "paused", "canceled", "none"
]
SUBSCRIPTION_ORDER = ("active", "trialing", "past_due", "paused", "canceled")

NOT_COUNTED_AS_ACTIVITY = (
    user_events.LOGIN_FAILED,
    user_events.ADMIN_ACTION,
    user_events.PASSWORD_RESET_REQUESTED,
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AdminMeRead(BaseModel):
    email: str


class BudgetRead(BaseModel):
    used_today: int
    used_this_month: int
    daily_limit: int
    monthly_limit: int


class RevenueRead(BaseModel):
    """Money for one currency, in its lowest unit (cents for USD)."""

    currency_code: str
    payments: int
    total: int
    refunded: int
    net: int


class ActivationRead(BaseModel):
    """How many accounts created in a window went on to use the product."""

    new_users: int = 0
    with_artwork: int = 0
    with_scan: int = 0


class OverviewRead(BaseModel):
    users_total: int
    users_new_24h: int
    users_new_7d: int
    users_active_24h: int
    users_active_7d: int
    suspended_users: int
    assets_total: int
    scans_24h: int
    scans_7d: int
    deep_scans_24h: int
    deep_scans_7d: int
    feedback_total: int
    feedback_7d: int
    failed_sign_ins_24h: int
    sign_ups_by_day: list[tuple[str, int]]
    serpapi: BudgetRead
    vision: BudgetRead
    event_retention_days: int
    revenue_this_month: list[RevenueRead] = []
    revenue_last_month: list[RevenueRead] = []
    paid_subscribers: int = 0
    paid_subscribers_by_plan: dict[str, int] = {}
    subscriptions_canceling: int = 0
    subscriptions_past_due: int = 0
    activation_7d: ActivationRead = Field(default_factory=ActivationRead)
    activation_30d: ActivationRead = Field(default_factory=ActivationRead)
    # Verdict buttons pressed on results in the last 7 days, by verdict.
    match_verdicts_7d: dict[str, int] = Field(default_factory=dict)


class EventRead(BaseModel):
    id: int
    event_type: str
    user_id: int | None
    email: str | None
    ip_address: str | None
    user_agent: str | None
    detail: str | None
    created_at: datetime


class EventPage(BaseModel):
    total: int
    items: list[EventRead]


class UserRow(BaseModel):
    id: int
    email: str
    plan_type: str
    created_at: datetime
    credits: int
    assets: int
    last_sign_in: datetime | None
    suspended: bool
    is_admin: bool
    email_verified: bool = True
    # The user's current Paddle subscription, if any.
    subscription_status: str | None = None
    subscription_plan: str | None = None
    subscription_interval: str | None = None
    renews_at: datetime | None = None
    cancels_at: datetime | None = None


class UserPage(BaseModel):
    total: int
    items: list[UserRow]


class FeedbackRow(BaseModel):
    id: int
    user_id: int
    email: str | None
    kind: str
    verdict: str | None
    similarity_percent: float | None
    overall_signal: str | None
    source_kind: str | None
    message: str | None
    answers: dict | None
    created_at: datetime


class FeedbackPage(BaseModel):
    total: int
    items: list[FeedbackRow]


class IpRow(BaseModel):
    ip_address: str
    events: int
    last_seen: datetime


class AssetRow(BaseModel):
    id: int
    title: str
    status: str
    created_at: datetime


class CreditRow(BaseModel):
    id: int
    delta: int
    reason: str
    note: str | None
    created_at: datetime


class SubscriptionRow(BaseModel):
    subscription_id: str
    customer_id: str
    status: str
    plan: str | None
    interval: str | None
    price_id: str | None
    started_at: datetime | None
    current_period_end: datetime | None
    scheduled_action: str | None
    scheduled_at: datetime | None
    has_access: bool
    updated_at: datetime


class AdjustmentRow(BaseModel):
    adjustment_id: str
    transaction_id: str
    action: str
    type: str | None
    status: str
    reason: str | None
    currency_code: str
    total: int
    created_at: datetime


class PaymentRow(BaseModel):
    transaction_id: str
    kind: str
    plan: str | None
    interval: str | None
    credits: int | None
    status: str
    origin: str | None
    subscription_id: str | None
    currency_code: str
    subtotal: int
    tax: int
    total: int
    fee: int | None
    earnings: int | None
    billed_at: datetime
    refunded: int
    adjustments: list[AdjustmentRow]


class PaidTotal(BaseModel):
    currency_code: str
    payments: int
    total: int
    refunded: int


class UserDetail(BaseModel):
    user: UserRow
    subscriptions: list[SubscriptionRow] = []
    payments: list[PaymentRow] = []
    # Adjustments on payments recorded before payments were kept.
    other_adjustments: list[AdjustmentRow] = []
    paid_totals: list[PaidTotal] = []
    suspension_reason: str | None
    assets_list: list[AssetRow]
    credit_entries: list[CreditRow]
    ips: list[IpRow]
    events: list[EventRead]
    feedback: list[FeedbackRow]


class CreditGrant(BaseModel):
    amount: int = Field(ge=1, le=1000)
    note: str | None = Field(default=None, max_length=300)


class PlanChange(BaseModel):
    plan_type: str = Field(max_length=20)


class Suspend(BaseModel):
    reason: str | None = Field(default=None, max_length=300)


class DeleteUser(BaseModel):
    confirm_email: str = Field(min_length=3, max_length=255)


class Done(BaseModel):
    ok: Literal[True] = True


def _event_read(event: UserEvent) -> EventRead:
    return EventRead(
        id=event.id,
        event_type=event.event_type,
        user_id=event.user_id,
        email=event.email,
        ip_address=event.ip_address,
        user_agent=event.user_agent,
        detail=event.detail,
        created_at=event.created_at,
    )


def _require_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return user


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _subscription_rank(subscription: PaddleSubscription, now: datetime):
    """Sort key: the subscription that matters most for a user first."""
    status_rank = (
        SUBSCRIPTION_ORDER.index(subscription.status)
        if subscription.status in SUBSCRIPTION_ORDER
        else len(SUBSCRIPTION_ORDER)
    )
    started = _aware(subscription.started_at) or datetime.min.replace(
        tzinfo=timezone.utc
    )

    return (
        0 if has_access(subscription, now) else 1,
        status_rank,
        -started.timestamp(),
    )


def _current_subscriptions(
    db: Session, ids: list[int]
) -> dict[int, PaddleSubscription]:
    now = _utc_now()
    found: dict[int, list[PaddleSubscription]] = {}

    for subscription in db.scalars(
        select(PaddleSubscription).where(PaddleSubscription.user_id.in_(ids))
    ):
        found.setdefault(subscription.user_id, []).append(subscription)

    return {
        user_id: min(items, key=lambda item: _subscription_rank(item, now))
        for user_id, items in found.items()
    }


def _cancels_at(subscription: PaddleSubscription) -> datetime | None:
    if subscription.scheduled_action == "cancel":
        return subscription.scheduled_at

    return None


def _subscription_filter(state: str):
    """A where-clause on User for one SubscriptionFilter value."""
    canceling = and_(
        PaddleSubscription.scheduled_action == "cancel",
        PaddleSubscription.status.in_(ACCESS_STATUSES),
    )

    if state == "none":
        return User.id.not_in(select(PaddleSubscription.user_id))

    if state == "active":
        condition = and_(
            PaddleSubscription.status.in_(("active", "trialing")),
            or_(
                PaddleSubscription.scheduled_action.is_(None),
                PaddleSubscription.scheduled_action != "cancel",
            ),
        )
    elif state == "canceling":
        condition = canceling
    else:
        condition = PaddleSubscription.status == state

    return User.id.in_(select(PaddleSubscription.user_id).where(condition))


def _money_back(adjustments: list[PaddleAdjustment]) -> int:
    """What was given back: approved refunds and chargebacks, net."""
    total = 0

    for adjustment in adjustments:
        if adjustment.status != "approved":
            continue

        if adjustment.action in MONEY_BACK:
            total += adjustment.total
        elif adjustment.action in MONEY_BACK_UNDONE:
            total -= adjustment.total

    return total


def _adjustment_row(adjustment: PaddleAdjustment) -> AdjustmentRow:
    return AdjustmentRow(
        adjustment_id=adjustment.adjustment_id,
        transaction_id=adjustment.transaction_id,
        action=adjustment.action,
        type=adjustment.type,
        status=adjustment.status,
        reason=adjustment.reason,
        currency_code=adjustment.currency_code,
        total=adjustment.total,
        created_at=adjustment.paddle_created_at,
    )


def _month_start(now: datetime, months_back: int = 0) -> datetime:
    year, month = now.year, now.month - months_back

    while month < 1:
        year, month = year - 1, month + 12

    return datetime(year, month, 1, tzinfo=timezone.utc)


def _revenue(
    db: Session, start: datetime, end: datetime | None
) -> list[RevenueRead]:
    """
    Payments billed in [start, end) and money given back in that time,
    per currency. Paddle's totals, tax included. No end: up to now.
    """
    rows: dict[str, RevenueRead] = {}

    def row(currency: str) -> RevenueRead:
        return rows.setdefault(
            currency,
            RevenueRead(
                currency_code=currency, payments=0, total=0, refunded=0, net=0
            ),
        )

    for currency, payments, total in db.execute(
        select(
            PaddleTransaction.currency_code,
            func.count(PaddleTransaction.transaction_id),
            func.sum(PaddleTransaction.total),
        )
        .where(
            PaddleTransaction.billed_at >= start,
            *([PaddleTransaction.billed_at < end] if end else []),
        )
        .group_by(PaddleTransaction.currency_code)
    ):
        entry = row(currency)
        entry.payments = int(payments or 0)
        entry.total = int(total or 0)

    adjustments = list(
        db.scalars(
            select(PaddleAdjustment).where(
                PaddleAdjustment.paddle_created_at >= start,
                *([PaddleAdjustment.paddle_created_at < end] if end else []),
            )
        )
    )

    for adjustment in adjustments:
        entry = row(adjustment.currency_code)
        entry.refunded += _money_back([adjustment])

    for entry in rows.values():
        entry.net = entry.total - entry.refunded

    return sorted(rows.values(), key=lambda entry: -entry.total)


def _user_rows(db: Session, users: list[User]) -> list[UserRow]:
    ids = [user.id for user in users]

    if not ids:
        return []

    credits = dict(
        db.execute(
            select(CreditEntry.user_id, func.sum(CreditEntry.delta))
            .where(CreditEntry.user_id.in_(ids))
            .group_by(CreditEntry.user_id)
        ).all()
    )
    assets = dict(
        db.execute(
            select(Asset.user_id, func.count(Asset.id))
            .where(Asset.user_id.in_(ids))
            .group_by(Asset.user_id)
        ).all()
    )
    last_in = dict(
        db.execute(
            select(UserEvent.user_id, func.max(UserEvent.created_at))
            .where(
                UserEvent.user_id.in_(ids),
                UserEvent.event_type.in_(user_events.SIGN_IN_EVENTS),
            )
            .group_by(UserEvent.user_id)
        ).all()
    )
    suspended = set(
        db.scalars(
            select(UserSuspension.user_id).where(
                UserSuspension.user_id.in_(ids)
            )
        )
    )
    confirmed = set(
        db.scalars(
            select(VerifiedUser.user_id).where(VerifiedUser.user_id.in_(ids))
        )
    )
    subscriptions = _current_subscriptions(db, ids)

    def subscription_fields(user_id: int) -> dict:
        subscription = subscriptions.get(user_id)

        if subscription is None:
            return {}

        return {
            "subscription_status": subscription.status,
            "subscription_plan": subscription.plan,
            "subscription_interval": subscription.interval,
            "renews_at": (
                None
                if _cancels_at(subscription)
                or subscription.status not in ACCESS_STATUSES
                else subscription.current_period_end
            ),
            "cancels_at": _cancels_at(subscription),
        }

    return [
        UserRow(
            id=user.id,
            email=user.email,
            plan_type=user.plan_type,
            created_at=user.created_at,
            credits=int(credits.get(user.id) or 0),
            assets=int(assets.get(user.id) or 0),
            last_sign_in=last_in.get(user.id),
            suspended=user.id in suspended,
            is_admin=is_admin_email(user.email),
            email_verified=(
                user.id in confirmed
                or not settings.email_verification_required
            ),
            **subscription_fields(user.id),
        )
        for user in users
    ]


def _feedback_rows(
    db: Session, entries: list[FeedbackEntry]
) -> list[FeedbackRow]:
    import json

    emails = dict(
        db.execute(
            select(User.id, User.email).where(
                User.id.in_({entry.user_id for entry in entries})
            )
        ).all()
    ) if entries else {}

    rows = []

    for entry in entries:
        answers = None

        if entry.answers_json:
            try:
                parsed = json.loads(entry.answers_json)
                answers = parsed if isinstance(parsed, dict) else None
            except ValueError:
                answers = None

        rows.append(
            FeedbackRow(
                id=entry.id,
                user_id=entry.user_id,
                email=emails.get(entry.user_id),
                kind=entry.kind,
                verdict=entry.verdict,
                similarity_percent=entry.similarity_percent,
                overall_signal=entry.overall_signal,
                source_kind=entry.source_kind,
                message=entry.message,
                answers=answers,
                created_at=entry.created_at,
            )
        )

    return rows


def _log_admin(
    db: Session, request: Request, admin: User, detail: str
) -> None:
    user_events.record_event(
        db,
        request,
        user_events.ADMIN_ACTION,
        user_id=admin.id,
        email=admin.email,
        detail=detail,
    )


@router.get("/me", response_model=AdminMeRead)
def read_admin(admin: User = Depends(get_admin_user)) -> AdminMeRead:
    return AdminMeRead(email=admin.email)


@router.get("/overview", response_model=OverviewRead)
def read_overview(db: Session = Depends(get_db)) -> OverviewRead:
    now = _utc_now()
    day = now - timedelta(days=1)
    week = now - timedelta(days=7)

    def count(stmt) -> int:
        return int(db.scalar(stmt) or 0)

    def active_since(since: datetime) -> int:
        return count(
            select(func.count(distinct(UserEvent.user_id))).where(
                UserEvent.created_at >= since,
                UserEvent.user_id.is_not(None),
                UserEvent.event_type.not_in(NOT_COUNTED_AS_ACTIVITY),
            )
        )

    def scans_since(since: datetime, *, deep: bool | None = None) -> int:
        stmt = select(func.count(ScanJob.id)).where(
            ScanJob.created_at >= since
        )

        if deep is True:
            stmt = stmt.where(ScanJob.provider.like("%serpapi-lens%"))

        return count(stmt)

    def activation_since(since: datetime) -> ActivationRead:
        # Accounts created since `since` that added an artwork / have a scan
        # (a scan can be one they started or a scheduled one on their artwork).
        return ActivationRead(
            new_users=count(
                select(func.count(User.id)).where(User.created_at >= since)
            ),
            with_artwork=count(
                select(func.count(distinct(Asset.user_id)))
                .select_from(Asset)
                .join(User, User.id == Asset.user_id)
                .where(User.created_at >= since)
            ),
            with_scan=count(
                select(func.count(distinct(Asset.user_id)))
                .select_from(Asset)
                .join(ScanJob, ScanJob.asset_id == Asset.id)
                .join(User, User.id == Asset.user_id)
                .where(User.created_at >= since)
            ),
        )

    verdicts_7d = {
        str(verdict): int(total)
        for verdict, total in db.execute(
            select(FeedbackEntry.verdict, func.count(FeedbackEntry.id))
            .where(
                FeedbackEntry.kind == "match_verdict",
                FeedbackEntry.verdict.is_not(None),
                FeedbackEntry.created_at >= week,
            )
            .group_by(FeedbackEntry.verdict)
        ).all()
    }

    sign_ups = db.execute(
        select(User.created_at).where(
            User.created_at >= now - timedelta(days=14)
        )
    ).scalars()
    per_day: dict[str, int] = {}

    for offset in range(13, -1, -1):
        per_day[(now - timedelta(days=offset)).strftime("%Y-%m-%d")] = 0

    for created in sign_ups:
        key = created.strftime("%Y-%m-%d")

        if key in per_day:
            per_day[key] += 1

    budget = get_budget_status(
        db,
        "serpapi",
        daily_limit=settings.serpapi_daily_limit,
        monthly_limit=settings.serpapi_monthly_limit,
    )

    vision_budget = get_budget_status(
        db,
        "vision",
        daily_limit=settings.vision_daily_limit,
        monthly_limit=settings.vision_monthly_limit,
    )

    subscribers: dict[str, set[int]] = {}
    canceling: set[int] = set()
    past_due: set[int] = set()

    for subscription in db.scalars(
        select(PaddleSubscription).where(
            PaddleSubscription.status.in_(ACCESS_STATUSES),
            PaddleSubscription.plan.in_(PAID_PLANS),
        )
    ):
        if not has_access(subscription, now):
            continue

        subscribers.setdefault(subscription.plan, set()).add(
            subscription.user_id
        )

        if _cancels_at(subscription):
            canceling.add(subscription.user_id)

        if subscription.status == "past_due":
            past_due.add(subscription.user_id)

    this_month = _month_start(now)

    return OverviewRead(
        revenue_this_month=_revenue(db, this_month, None),
        revenue_last_month=_revenue(db, _month_start(now, 1), this_month),
        paid_subscribers=len(set().union(*subscribers.values())),
        paid_subscribers_by_plan={
            plan: len(users) for plan, users in sorted(subscribers.items())
        },
        subscriptions_canceling=len(canceling),
        subscriptions_past_due=len(past_due),
        users_total=count(select(func.count(User.id))),
        users_new_24h=count(
            select(func.count(User.id)).where(User.created_at >= day)
        ),
        users_new_7d=count(
            select(func.count(User.id)).where(User.created_at >= week)
        ),
        users_active_24h=active_since(day),
        users_active_7d=active_since(week),
        suspended_users=count(select(func.count(UserSuspension.user_id))),
        assets_total=count(select(func.count(Asset.id))),
        scans_24h=scans_since(day),
        scans_7d=scans_since(week),
        deep_scans_24h=scans_since(day, deep=True),
        deep_scans_7d=scans_since(week, deep=True),
        feedback_total=count(select(func.count(FeedbackEntry.id))),
        feedback_7d=count(
            select(func.count(FeedbackEntry.id)).where(
                FeedbackEntry.created_at >= week
            )
        ),
        failed_sign_ins_24h=count(
            select(func.count(UserEvent.id)).where(
                UserEvent.event_type == user_events.LOGIN_FAILED,
                UserEvent.created_at >= day,
            )
        ),
        sign_ups_by_day=list(per_day.items()),
        serpapi=BudgetRead(
            used_today=budget.used_today,
            used_this_month=budget.used_this_month,
            daily_limit=budget.daily_limit,
            monthly_limit=budget.monthly_limit,
        ),
        vision=BudgetRead(
            used_today=vision_budget.used_today,
            used_this_month=vision_budget.used_this_month,
            daily_limit=vision_budget.daily_limit,
            monthly_limit=vision_budget.monthly_limit,
        ),
        event_retention_days=settings.event_retention_days,
        activation_7d=activation_since(week),
        activation_30d=activation_since(now - timedelta(days=30)),
        match_verdicts_7d=verdicts_7d,
    )


@router.get("/users", response_model=UserPage)
def list_users(
    q: str | None = Query(default=None, max_length=100),
    plan: str | None = Query(default=None, max_length=20),
    subscription: SubscriptionFilter | None = Query(default=None),
    paid: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> UserPage:
    stmt = select(User)
    count_stmt = select(func.count(User.id))
    conditions = []

    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        conditions.append(User.email.like(needle))

    if plan:
        conditions.append(User.plan_type == plan)

    if subscription:
        conditions.append(_subscription_filter(subscription))

    if paid is not None:
        payers = select(PaddleTransaction.user_id).where(
            PaddleTransaction.user_id.is_not(None)
        )
        conditions.append(
            User.id.in_(payers) if paid else User.id.not_in(payers)
        )

    for condition in conditions:
        stmt = stmt.where(condition)
        count_stmt = count_stmt.where(condition)

    users = list(
        db.scalars(
            stmt.order_by(User.id.desc()).limit(limit).offset(offset)
        )
    )

    return UserPage(
        total=int(db.scalar(count_stmt) or 0),
        items=_user_rows(db, users),
    )


@router.get("/users/{user_id}", response_model=UserDetail)
def read_user(user_id: int, db: Session = Depends(get_db)) -> UserDetail:
    user = _require_user(db, user_id)

    suspension = db.get(UserSuspension, user_id)

    assets = list(
        db.scalars(
            select(Asset)
            .where(Asset.user_id == user_id)
            .order_by(Asset.id.desc())
            .limit(50)
        )
    )
    credit_entries = list(
        db.scalars(
            select(CreditEntry)
            .where(CreditEntry.user_id == user_id)
            .order_by(CreditEntry.id.desc())
            .limit(30)
        )
    )
    ips = db.execute(
        select(
            UserEvent.ip_address,
            func.count(UserEvent.id),
            func.max(UserEvent.created_at),
        )
        .where(
            UserEvent.user_id == user_id,
            UserEvent.ip_address.is_not(None),
        )
        .group_by(UserEvent.ip_address)
        .order_by(func.max(UserEvent.created_at).desc())
        .limit(30)
    ).all()
    events = list(
        db.scalars(
            select(UserEvent)
            .where(UserEvent.user_id == user_id)
            .order_by(UserEvent.id.desc())
            .limit(60)
        )
    )
    feedback = list(
        db.scalars(
            select(FeedbackEntry)
            .where(FeedbackEntry.user_id == user_id)
            .order_by(FeedbackEntry.id.desc())
            .limit(50)
        )
    )

    now = _utc_now()
    subscriptions = sorted(
        db.scalars(
            select(PaddleSubscription).where(
                PaddleSubscription.user_id == user_id
            )
        ),
        key=lambda item: _subscription_rank(item, now),
    )
    payments = list(
        db.scalars(
            select(PaddleTransaction)
            .where(PaddleTransaction.user_id == user_id)
            .order_by(PaddleTransaction.billed_at.desc())
            .limit(100)
        )
    )
    payment_ids = [payment.transaction_id for payment in payments]
    adjustments = list(
        db.scalars(
            select(PaddleAdjustment)
            .where(
                or_(
                    PaddleAdjustment.transaction_id.in_(payment_ids),
                    PaddleAdjustment.user_id == user_id,
                )
            )
            .order_by(PaddleAdjustment.paddle_created_at.desc())
        )
    )
    by_payment: dict[str, list[PaddleAdjustment]] = {}

    for adjustment in adjustments:
        by_payment.setdefault(adjustment.transaction_id, []).append(adjustment)

    totals: dict[str, PaidTotal] = {}

    for payment in payments:
        entry = totals.setdefault(
            payment.currency_code,
            PaidTotal(
                currency_code=payment.currency_code,
                payments=0,
                total=0,
                refunded=0,
            ),
        )
        entry.payments += 1
        entry.total += payment.total
        entry.refunded += _money_back(
            by_payment.get(payment.transaction_id, [])
        )

    return UserDetail(
        user=_user_rows(db, [user])[0],
        subscriptions=[
            SubscriptionRow(
                subscription_id=item.subscription_id,
                customer_id=item.customer_id,
                status=item.status,
                plan=item.plan,
                interval=item.interval,
                price_id=item.price_id,
                started_at=item.started_at,
                current_period_end=item.current_period_end,
                scheduled_action=item.scheduled_action,
                scheduled_at=item.scheduled_at,
                has_access=has_access(item, now),
                updated_at=item.updated_at,
            )
            for item in subscriptions
        ],
        payments=[
            PaymentRow(
                transaction_id=payment.transaction_id,
                kind=payment.kind,
                plan=payment.plan,
                interval=payment.interval,
                credits=payment.credits,
                status=payment.status,
                origin=payment.origin,
                subscription_id=payment.subscription_id,
                currency_code=payment.currency_code,
                subtotal=payment.subtotal,
                tax=payment.tax,
                total=payment.total,
                fee=payment.fee,
                earnings=payment.earnings,
                billed_at=payment.billed_at,
                refunded=_money_back(
                    by_payment.get(payment.transaction_id, [])
                ),
                adjustments=[
                    _adjustment_row(adjustment)
                    for adjustment in by_payment.get(
                        payment.transaction_id, []
                    )
                ],
            )
            for payment in payments
        ],
        other_adjustments=[
            _adjustment_row(adjustment)
            for adjustment in adjustments
            if adjustment.transaction_id not in payment_ids
        ],
        paid_totals=sorted(totals.values(), key=lambda entry: -entry.total),
        suspension_reason=suspension.reason if suspension else None,
        assets_list=[
            AssetRow(
                id=a.id,
                title=a.title,
                status=a.status,
                created_at=a.created_at,
            )
            for a in assets
        ],
        credit_entries=[
            CreditRow(
                id=c.id,
                delta=c.delta,
                reason=c.reason,
                note=c.note,
                created_at=c.created_at,
            )
            for c in credit_entries
        ],
        ips=[
            IpRow(ip_address=ip, events=int(n), last_seen=last)
            for ip, n, last in ips
        ],
        events=[_event_read(e) for e in events],
        feedback=_feedback_rows(db, feedback),
    )


@router.get("/feedback", response_model=FeedbackPage)
def list_feedback(
    kind: str | None = Query(default=None, max_length=30),
    limit: int = Query(default=50, ge=1, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> FeedbackPage:
    stmt = select(FeedbackEntry)
    count_stmt = select(func.count(FeedbackEntry.id))

    if kind:
        stmt = stmt.where(FeedbackEntry.kind == kind)
        count_stmt = count_stmt.where(FeedbackEntry.kind == kind)

    entries = list(
        db.scalars(
            stmt.order_by(FeedbackEntry.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )

    return FeedbackPage(
        total=int(db.scalar(count_stmt) or 0),
        items=_feedback_rows(db, entries),
    )


@router.get("/events", response_model=EventPage)
def list_events(
    q: str | None = Query(default=None, max_length=100),
    event_type: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=100, ge=1, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> EventPage:
    stmt = select(UserEvent)
    count_stmt = select(func.count(UserEvent.id))

    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        match = or_(
            func.lower(UserEvent.email).like(needle),
            UserEvent.ip_address.like(needle),
        )
        stmt = stmt.where(match)
        count_stmt = count_stmt.where(match)

    if event_type:
        stmt = stmt.where(UserEvent.event_type == event_type)
        count_stmt = count_stmt.where(UserEvent.event_type == event_type)

    events = list(
        db.scalars(
            stmt.order_by(UserEvent.id.desc()).limit(limit).offset(offset)
        )
    )

    return EventPage(
        total=int(db.scalar(count_stmt) or 0),
        items=[_event_read(event) for event in events],
    )


@router.post("/users/{user_id}/credits", response_model=Done)
def add_credits(
    user_id: int,
    payload: CreditGrant,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    user = _require_user(db, user_id)

    grant_credits(
        db,
        user_id=user.id,
        amount=payload.amount,
        note=payload.note or "Added by admin",
    )
    _log_admin(
        db,
        request,
        admin,
        f"+{payload.amount} credits to #{user.id} {user.email}",
    )

    return Done()


@router.post("/users/{user_id}/remove-credits", response_model=Done)
def take_back_credits(
    user_id: int,
    payload: CreditGrant,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    user = _require_user(db, user_id)

    try:
        remove_credits(
            db,
            user_id=user.id,
            amount=payload.amount,
            note=payload.note or "Removed by admin",
        )
    except InsufficientCredits as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {exc.balance} credit(s) left to take back.",
        ) from exc

    _log_admin(
        db,
        request,
        admin,
        f"-{payload.amount} credits from #{user.id} {user.email}",
    )

    return Done()


@router.post("/users/{user_id}/plan", response_model=Done)
def change_plan(
    user_id: int,
    payload: PlanChange,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    user = _require_user(db, user_id)

    if payload.plan_type not in PLAN_LIMITS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unknown plan. Choose one of: "
            + ", ".join(sorted(PLAN_LIMITS)),
        )

    before = user.plan_type
    user.plan_type = payload.plan_type
    db.commit()

    _log_admin(
        db,
        request,
        admin,
        f"plan {before} -> {payload.plan_type} for #{user.id} {user.email}",
    )

    return Done()


@router.post("/users/{user_id}/revoke-sessions", response_model=Done)
def revoke_user_sessions(
    user_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    user = _require_user(db, user_id)

    revoke_sessions(db, user.id)
    db.commit()

    _log_admin(
        db,
        request,
        admin,
        f"signed out all sessions of #{user.id} {user.email}",
    )

    return Done()


@router.post("/users/{user_id}/suspend", response_model=Done)
def suspend_user(
    user_id: int,
    payload: Suspend,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    user = _require_user(db, user_id)

    if is_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="An admin account cannot be suspended.",
        )

    if db.get(UserSuspension, user.id) is None:
        db.add(
            UserSuspension(
                user_id=user.id,
                reason=(payload.reason or "").strip() or None,
            )
        )

    revoke_sessions(db, user.id)
    db.commit()

    _log_admin(
        db,
        request,
        admin,
        f"suspended #{user.id} {user.email}"
        + (f": {payload.reason}" if payload.reason else ""),
    )

    return Done()


@router.post("/users/{user_id}/delete", response_model=Done)
def delete_user(
    user_id: int,
    payload: DeleteUser,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    """
    Permanently delete an account, its artworks and files, the same way the
    owner's own "delete my account" does. The admin types the account's
    email again; an admin account cannot be deleted here.
    """
    user = _require_user(db, user_id)

    if is_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="An admin account cannot be deleted.",
        )

    if payload.confirm_email.strip().lower() != user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The email address does not match this account.",
        )

    try:
        paddle_billing.stop_subscriptions_for_deletion(db, user.id)
    except paddle_billing.PaddleApiError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The subscription could not be ended at Paddle, so the "
                "account was not deleted. Try again in a few minutes."
            ),
        )

    label = f"#{user.id} {user.email}"
    folders = delete_account(db, user)
    remove_folders(folders)

    _log_admin(db, request, admin, f"deleted account {label}")

    return Done()


@router.post("/users/{user_id}/unsuspend", response_model=Done)
def unsuspend_user(
    user_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    user = _require_user(db, user_id)

    suspension = db.get(UserSuspension, user.id)

    if suspension is not None:
        db.delete(suspension)
        db.commit()

    _log_admin(
        db,
        request,
        admin,
        f"lifted suspension of #{user.id} {user.email}",
    )

    return Done()


@router.post("/users/{user_id}/verify-email", response_model=Done)
def confirm_user_email(
    user_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Done:
    """Mark an address confirmed by hand (for example after a support email)."""
    user = _require_user(db, user_id)

    email_verification.mark_verified(db, user.id)
    db.commit()

    _log_admin(
        db,
        request,
        admin,
        f"confirmed the email of #{user.id} {user.email}",
    )

    return Done()
