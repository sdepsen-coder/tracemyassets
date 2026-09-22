from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MonitoringPreference(Base):
    __tablename__ = "monitoring_preferences"
    __table_args__ = (
        UniqueConstraint(
            "asset_id",
            name="uq_monitoring_preferences_asset_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id"),
        index=True,
        nullable=False,
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    alert_threshold_percent: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=80.0,
    )
    scan_frequency: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="weekly",
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