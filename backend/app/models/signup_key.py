from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SignupKey(Base):
    """
    The mailbox an account was opened with, in a form that ignores the
    tricks that make one mailbox look like many ("ann+1@gmail.com",
    "a.n.n@gmail.com"). One row per account; the key is unique, so a second
    account for the same mailbox is refused.
    """

    __tablename__ = "signup_keys"

    canonical_email: Mapped[str] = mapped_column(
        String(255),
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )
