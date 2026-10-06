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
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_admin_user, get_db, is_admin_email
from app.core.config import settings
from app.core.plan_limits import PLAN_LIMITS
from app.models.asset import Asset
from app.models.credit_entry import CreditEntry
from app.models.email_verification import VerifiedUser
from app.models.feedback import FeedbackEntry
from app.models.scan_job import ScanJob
from app.models.user import User
from app.models.user_event import UserEvent
from app.models.user_suspension import UserSuspension
from app.services import email_verification, user_events
from app.services.credits import get_balance, grant_credits
from app.services.provider_budget import get_budget_status
from app.services.session_cutoff import revoke_sessions

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_admin_user)],
)

MAX_PAGE = 200
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
    event_retention_days: int


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


class UserDetail(BaseModel):
    user: UserRow
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

    return OverviewRead(
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
        event_retention_days=settings.event_retention_days,
    )


@router.get("/users", response_model=UserPage)
def list_users(
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> UserPage:
    stmt = select(User)
    count_stmt = select(func.count(User.id))

    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        stmt = stmt.where(User.email.like(needle))
        count_stmt = count_stmt.where(User.email.like(needle))

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

    return UserDetail(
        user=_user_rows(db, [user])[0],
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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
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
