from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SignupAttribution(Base):
    """
    Where a new account came from: the short tag in the link that brought
    the person here ("?ref=hearked-bluesky"). One row per account, written
    once at sign-up and never changed.

    A separate table (not a column on users) so that it appears on its own
    when the app starts: create_all adds new tables but never alters
    existing ones. Removed with the account (see services.account_deletion).
    Accounts without a tag simply have no row.
    """

    __tablename__ = "signup_attributions"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True,
    )

    ref: Mapped[str] = mapped_column(String(80), index=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
