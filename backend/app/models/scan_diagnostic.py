from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ScanDiagnostic(Base):
    """
    Why a scan's candidates did or did not become matches, kept per scan.

    Counts only (plus the best similarity among the rejected candidates),
    never addresses: the same rule as ScanDiagnostics in scan_runner. It is
    a table of its own because the schema is created with create_all(),
    which adds tables but never columns to one that already exists.

    One row per finished scan. Scans that failed, and scans from before
    this table existed, have none.
    """

    __tablename__ = "scan_diagnostics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    scan_job_id: Mapped[int] = mapped_column(
        ForeignKey("scan_jobs.id"),
        unique=True,
        index=True,
        nullable=False,
    )

    candidates: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    no_image_address: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    image_unreachable: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    not_comparable: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    below_threshold: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    page_gone: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    page_unrelated: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    page_unreadable: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    recorded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    best_similarity_percent: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    providers_asked: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    provider_failures: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
