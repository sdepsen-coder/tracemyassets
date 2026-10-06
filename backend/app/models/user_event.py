from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UserEvent(Base):
    """
    One thing that happened in the app, kept for the admin pages and for
    spotting abuse: sign-ups, sign-ins (and failed ones), scans, feedback,
    and what an admin changed.

    Rows are deleted after EVENT_RETENTION_DAYS (see services.user_events),
    because they hold personal data (an IP address and a browser string).

    user_id deliberately has no foreign key and email is kept next to it:
    a failed sign-in has no user at all, and an event must stay readable
    after an account is gone.
    """

    __tablename__ = "user_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    event_type: Mapped[str] = mapped_column(
        String(40),
        index=True,
        nullable=False,
    )

    user_id: Mapped[int | None] = mapped_column(index=True, nullable=True)

    # The address the person typed or signed in with (lower case).
    email: Mapped[str | None] = mapped_column(
        String(255),
        index=True,
        nullable=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        String(64),
        index=True,
        nullable=True,
    )

    user_agent: Mapped[str | None] = mapped_column(
        String(300),
        nullable=True,
    )

    # A short human-readable note ("asset 12", "plan Free -> Pro").
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
