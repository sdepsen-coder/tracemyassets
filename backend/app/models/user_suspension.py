from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UserSuspension(Base):
    """
    A row here means the account is suspended: it cannot sign in and every
    existing session stops working. Deleting the row lifts the suspension.
    Kept in its own table because the users table cannot get new columns.
    """

    __tablename__ = "user_suspensions"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True,
    )

    reason: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
