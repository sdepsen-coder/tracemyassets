from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.monitoring import MonitoringPreference


DEFAULT_ALERT_THRESHOLD_PERCENT = 80.0
DEFAULT_SCAN_FREQUENCY = "weekly"


def count_enabled_monitoring_for_user(
    db: Session,
    *,
    user_id: int,
    exclude_asset_id: int | None = None,
) -> int:
    """
    How many of this user's assets currently have monitoring enabled --
    used to enforce PLAN_LIMITS.max_monitored_assets. Excludes one
    asset_id on request so re-saving an already-enabled asset's other
    settings (threshold, frequency) doesn't count it against itself.
    """
    statement = (
        select(func.count())
        .select_from(MonitoringPreference)
        .join(Asset, Asset.id == MonitoringPreference.asset_id)
        .where(
            Asset.user_id == user_id,
            MonitoringPreference.enabled.is_(True),
        )
    )

    if exclude_asset_id is not None:
        statement = statement.where(Asset.id != exclude_asset_id)

    return db.scalar(statement) or 0


def get_monitoring_preference(
    db: Session,
    *,
    asset_id: int,
) -> MonitoringPreference | None:
    statement = select(MonitoringPreference).where(
        MonitoringPreference.asset_id == asset_id,
    )

    return db.scalar(statement)


def get_or_create_monitoring_preference(
    db: Session,
    *,
    asset_id: int,
) -> MonitoringPreference:
    preference = get_monitoring_preference(db, asset_id=asset_id)

    if preference is not None:
        return preference

    preference = MonitoringPreference(
        asset_id=asset_id,
        enabled=False,
        alert_threshold_percent=DEFAULT_ALERT_THRESHOLD_PERCENT,
        scan_frequency=DEFAULT_SCAN_FREQUENCY,
    )

    db.add(preference)
    db.flush()
    db.refresh(preference)

    return preference


def update_monitoring_preference(
    db: Session,
    *,
    asset_id: int,
    enabled: bool,
    alert_threshold_percent: float,
    scan_frequency: str,
) -> MonitoringPreference:
    preference = get_or_create_monitoring_preference(
        db,
        asset_id=asset_id,
    )

    preference.enabled = enabled
    preference.alert_threshold_percent = alert_threshold_percent
    preference.scan_frequency = scan_frequency

    db.add(preference)
    db.flush()
    db.refresh(preference)

    return preference