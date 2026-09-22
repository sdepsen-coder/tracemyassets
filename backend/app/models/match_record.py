from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MatchRecord(Base):
    __tablename__ = "match_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id"),
        index=True,
        nullable=False,
    )

    scan_job_id: Mapped[int | None] = mapped_column(
        ForeignKey("scan_jobs.id"),
        index=True,
        nullable=True,
    )

    source_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    source_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
    )

    candidate_image_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
    )

    candidate_page_url: Mapped[str | None] = mapped_column(
        String(2048),
        nullable=True,
    )

    candidate_image_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    similarity_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    watermark_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    watermark_matches_reference: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    overall_signal: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="NO_STRONG_VISUAL_MATCH",
    )

    review_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="new",
        index=True,
    )

    found_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    dismissed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
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