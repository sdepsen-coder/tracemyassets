import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.paddle import PaddleSubscription
from app.models.user import User
from app.services import paddle_billing

logger = logging.getLogger("tracemyassets.paddle")

router = APIRouter(prefix="/billing", tags=["billing"])


class BillingConfigRead(BaseModel):
    enabled: bool
    environment: str
    client_token: str
    # {"Pro": {"month": "pri_...", "year": "pri_..."}, "Extra": {...}}
    prices: dict[str, dict[str, str]]


@router.get("/config", response_model=BillingConfigRead)
def read_billing_config() -> BillingConfigRead:
    """What the browser needs to open Paddle's checkout (nothing secret)."""
    prices = paddle_billing.price_table()
    enabled = bool(
        settings.paddle_client_token
        and paddle_billing.billing_enabled()
        and prices
    )

    if not enabled:
        logger.warning(
            "Payments are off: client token %s, webhook secret %s, prices found %s.",
            "set" if settings.paddle_client_token else "MISSING",
            "set" if paddle_billing.billing_enabled() else "MISSING",
            "yes" if prices else "NO",
        )

    return BillingConfigRead(
        enabled=enabled,
        environment=settings.paddle_environment,
        client_token=settings.paddle_client_token if enabled else "",
        prices=prices if enabled else {},
    )


class SubscriptionRead(BaseModel):
    plan: str
    interval: str | None
    status: str
    # When access ends if it was cancelled, otherwise the next renewal.
    cancels_on: datetime | None
    renews_on: datetime | None
    payment_problem: bool


class BillingStatusRead(BaseModel):
    user_id: int
    email: str
    plan_type: str
    subscription: SubscriptionRead | None


def _current_subscription(
    db: Session, user_id: int
) -> PaddleSubscription | None:
    rows = list(
        db.scalars(
            select(PaddleSubscription)
            .where(PaddleSubscription.user_id == user_id)
            .order_by(PaddleSubscription.updated_at.desc())
        )
    )
    now = datetime.now(timezone.utc)

    for row in rows:
        if paddle_billing.has_access(row, now):
            return row

    return None


@router.get("/status", response_model=BillingStatusRead)
def read_billing_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BillingStatusRead:
    """Plan and subscription state, for the account page and checkout."""
    subscription = _current_subscription(db, user.id)
    detail = None

    if subscription is not None:
        cancelling = subscription.scheduled_action == "cancel"
        detail = SubscriptionRead(
            plan=subscription.plan or "",
            interval=subscription.interval,
            status=subscription.status,
            cancels_on=subscription.scheduled_at if cancelling else None,
            renews_on=None if cancelling else subscription.current_period_end,
            payment_problem=subscription.status == "past_due",
        )

    return BillingStatusRead(
        user_id=user.id,
        email=user.email,
        plan_type=user.plan_type,
        subscription=detail,
    )


class PortalRead(BaseModel):
    url: str


@router.post("/portal", response_model=PortalRead)
def open_customer_portal(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortalRead:
    """A fresh link to Paddle's portal: change card, cancel, invoices."""
    subscription = _current_subscription(db, user.id)

    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="There is no active subscription on this account.",
        )

    try:
        url = paddle_billing.create_portal_url(
            subscription.customer_id, [subscription.subscription_id]
        )
    except paddle_billing.PaddleApiError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The billing page could not be opened just now. Please try again.",
        )

    return PortalRead(url=url)


@router.post("/webhook", include_in_schema=False)
async def paddle_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Paddle's notifications. Not for browsers: it is trusted only if the
    signature over the exact bytes received checks out.
    """
    if not paddle_billing.billing_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payments are not set up.",
        )

    raw = await request.body()

    if not paddle_billing.verify_signature(
        raw,
        request.headers.get("paddle-signature"),
        settings.paddle_webhook_secret,
        tolerance_seconds=settings.paddle_signature_tolerance_seconds,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bad signature.",
        )

    try:
        event = json.loads(raw)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not JSON.",
        )

    if not isinstance(event, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unexpected body.",
        )

    result = await run_in_threadpool(paddle_billing.handle_event, db, event)

    return {"result": result}
