from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FeedbackEntry(Base):
    """
    One piece of beta feedback, either:

    - kind="match_verdict": a user's verdict on one match ("useful",
      "irrelevant", "unrelated" or "different"). At most one per user and match
      (see the unique constraint), changed in place if the user changes
      their mind. These feed threshold tuning.
    - kind="beta_survey": answers to the short in-app beta questions.
    - kind="general": a free-text message.

    match_id deliberately has NO foreign key: deleting an artwork deletes
    its matches (see crud.asset.delete_asset), but the verdict is still
    useful for tuning, so it must survive that. To keep it meaningful
    without keeping the match itself, a small snapshot of the technical
    result is stored alongside it -- never the page or image address.
    """

    __tablename__ = "feedback_entries"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "kind",
            "match_id",
            name="uq_feedback_user_kind_match",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        index=True,
        nullable=False,
    )

    kind: Mapped[str] = mapped_column(
        String(30),
        index=True,
        nullable=False,
    )

    match_id: Mapped[int | None] = mapped_column(
        index=True,
        nullable=True,
    )

    verdict: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    # Snapshot of the match at the time of the verdict.
    similarity_percent: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    overall_signal: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    source_kind: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # JSON-encoded {question_key: answer} for kind="beta_survey".
    answers_json: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
