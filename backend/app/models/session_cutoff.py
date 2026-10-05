from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SessionCutoff(Base):
    """
    "Sessions issued before this moment no longer count" -- one row per
    user, written when a password is reset or the user signs out of all
    devices. Session tokens are signed and carry the second they were
    issued (iat), so a token older than valid_from is refused without
    keeping a list of every token ever handed out.
    """

    __tablename__ = "session_cutoffs"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True,
    )

    # Unix seconds, compared with the token's iat (also whole seconds).
    valid_from: Mapped[int] = mapped_column(nullable=False)
