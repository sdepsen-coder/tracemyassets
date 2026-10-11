from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PaddleSubscription(Base):
    """
    One Paddle subscription, as last reported by Paddle's webhooks. The
    user's plan_type is derived from it (see services.paddle_billing);
    this table keeps what that decision needs and what the customer
    portal needs (customer_id).
    """

    __tablename__ = "paddle_subscriptions"

    subscription_id: Mapped[str] = mapped_column(String(60), primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )

    customer_id: Mapped[str] = mapped_column(String(60), nullable=False)

    # Paddle's status: active, trialing, past_due, paused, canceled.
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    plan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    interval: Mapped[str | None] = mapped_column(String(10), nullable=True)
    price_id: Mapped[str | None] = mapped_column(String(60), nullable=True)

    # Start of the subscription: monthly Deep scan credits count from it.
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # A change Paddle has scheduled (usually "cancel at the period end").
    scheduled_action: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # occurred_at of the newest event applied: an older one arriving late
    # is ignored.
    last_event_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class PaddleEvent(Base):
    """An event already handled. Paddle delivers at least once."""

    __tablename__ = "paddle_events"

    event_id: Mapped[str] = mapped_column(String(60), primary_key=True)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
