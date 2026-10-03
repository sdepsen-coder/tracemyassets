from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ProviderUsage(Base):
    """
    One row per billable call made to a paid discovery provider.

    Append-only. The budget guard (app.services.provider_budget) sums
    these to know how much of a provider's daily and monthly allowance is
    already spent. asset_id deliberately has no foreign key: deleting an
    artwork must not erase the record of money already spent on it.
    """

    __tablename__ = "provider_usage"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    provider: Mapped[str] = mapped_column(
        String(40),
        index=True,
        nullable=False,
    )

    units: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    asset_id: Mapped[int | None] = mapped_column(
        index=True,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
        nullable=False,
    )
