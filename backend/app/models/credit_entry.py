from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CreditEntry(Base):
    """
    One line in a user's credit ledger. Append-only: a balance is the sum
    of a user's deltas, and nothing is ever edited or deleted, so every
    credit can be traced to why it was given or taken.

    reason is one of:
      welcome    the one-time beta credits every account starts with
      grant      credits added by hand (see scripts/grant_credits.py)
      deep_scan  one credit taken when a deep scan starts (delta -1)
      refund     that credit given back because no search could be made

    grant_key makes a once-only grant impossible to repeat: (user_id,
    grant_key) is unique, so two requests racing to give the welcome
    credits cannot both succeed. refund_of makes a double refund
    impossible in the same way.

    asset_id deliberately has no foreign key: deleting an artwork must not
    erase the record of a credit that was spent on it.
    """

    __tablename__ = "credit_entries"

    __table_args__ = (
        UniqueConstraint("user_id", "grant_key", name="uq_credit_user_grant"),
        UniqueConstraint("refund_of", name="uq_credit_refund_of"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )

    delta: Mapped[int] = mapped_column(Integer, nullable=False)

    reason: Mapped[str] = mapped_column(
        String(20),
        index=True,
        nullable=False,
    )

    grant_key: Mapped[str | None] = mapped_column(
        String(40),
        nullable=True,
    )

    refund_of: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    asset_id: Mapped[int | None] = mapped_column(
        index=True,
        nullable=True,
    )

    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
