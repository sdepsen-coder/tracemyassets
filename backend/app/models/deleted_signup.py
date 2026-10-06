from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DeletedSignup(Base):
    """
    A one-way fingerprint (keyed hash) of the mailbox of a deleted account.

    It exists only so that deleting an account and registering again with
    the same mailbox cannot be used to claim the free welcome credits a
    second time. It holds no email address and nothing else about the
    person, and is removed after a year.
    """

    __tablename__ = "deleted_signups"

    key_hash: Mapped[str] = mapped_column(String(64), primary_key=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
