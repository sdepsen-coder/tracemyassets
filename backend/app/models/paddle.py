from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
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


class PaddleTransaction(Base):
    """
    One completed Paddle payment (a plan or a credit pack), as Paddle's
    transaction.completed webhook reported it. Amounts are Paddle's own
    totals in the lowest unit of the currency ("1299" USD = $12.99);
    nothing here is computed from our price list. Kept for the admin
    pages: who paid what and when.
    """

    __tablename__ = "paddle_transactions"

    transaction_id: Mapped[str] = mapped_column(String(60), primary_key=True)

    # None when no account could be matched (logged; fixed up later if the
    # subscription arrives).
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=True
    )

    subscription_id: Mapped[str | None] = mapped_column(
        String(60), index=True, nullable=True
    )
    customer_id: Mapped[str | None] = mapped_column(String(60), nullable=True)

    # plan, pack or other.
    kind: Mapped[str] = mapped_column(String(10), nullable=False)
    plan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    interval: Mapped[str | None] = mapped_column(String(10), nullable=True)
    credits: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Paddle's status (completed) and origin (web, subscription_recurring...).
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    origin: Mapped[str | None] = mapped_column(String(40), nullable=True)

    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tax: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Paddle's fee and what is left for us; not always reported.
    fee: Mapped[int | None] = mapped_column(Integer, nullable=True)
    earnings: Mapped[int | None] = mapped_column(Integer, nullable=True)

    billed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class PaddleAdjustment(Base):
    """
    A refund, credit or chargeback Paddle made against a transaction, as
    its adjustment.* webhooks last reported it. Amounts as in
    PaddleTransaction.
    """

    __tablename__ = "paddle_adjustments"

    adjustment_id: Mapped[str] = mapped_column(String(60), primary_key=True)

    # No foreign key: the payment may predate PaddleTransaction.
    transaction_id: Mapped[str] = mapped_column(
        String(60), index=True, nullable=False
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=True
    )

    # refund, credit, chargeback, chargeback_reverse, ...
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    # full or partial.
    type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # pending_approval, approved, rejected, reversed.
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Paddle's own times; updated_at keeps a late, older event from
    # overwriting a newer status.
    paddle_created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    paddle_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
