from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.crud.monitoring import count_enabled_monitoring_for_user
from app.models.asset import Asset


def get_asset(
    db: Session,
    asset_id: int,
    user_id: int,
) -> Asset | None:
    statement = select(Asset).where(
        Asset.id == asset_id,
        Asset.user_id == user_id,
    )

    return db.scalar(statement)


def set_asset_archived(
    db: Session,
    *,
    asset: Asset,
    archived: bool,
) -> Asset:
    """
    Archive or restore an asset.

    Archiving also turns off monitoring for it -- there is no reason
    to keep spending scan/provider budget on something the user set
    aside. Restoring does NOT automatically turn monitoring back on;
    that is a deliberate choice the user makes again, same as for a
    brand new asset.
    """
    from app.crud.monitoring import get_monitoring_preference

    asset.status = "archived" if archived else "active"
    db.add(asset)

    if archived:
        preference = get_monitoring_preference(db, asset_id=asset.id)

        if preference is not None and preference.enabled:
            preference.enabled = False
            db.add(preference)

    db.flush()
    db.refresh(asset)

    return asset


def get_assets(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    status: str | None = "active",
) -> list[Asset]:
    statement = (
        select(Asset)
        .where(Asset.user_id == user_id)
        .order_by(Asset.id.desc())
        .offset(skip)
        .limit(limit)
    )

    if status is not None:
        statement = statement.where(Asset.status == status)

    return list(db.scalars(statement).all())


def create_asset(
    db: Session,
    *,
    user_id: int,
    title: str,
    original_reference: str,
    phash_value: str,
) -> Asset:
    asset = Asset(
        user_id=user_id,
        title=title,
        original_url=original_reference,
        phash_value=phash_value,
        watermarked_url=None,
        watermark_payload=None,
        status="active",
    )

    db.add(asset)
    db.flush()
    db.refresh(asset)

    # The endpoint commits after preparing its response.
    return asset


def set_asset_status(
    db: Session,
    *,
    asset: Asset,
    status: str,
) -> Asset:
    asset.status = status

    db.add(asset)
    db.flush()
    db.refresh(asset)

    return asset


def get_asset_stats(
    db: Session,
    user_id: int,
) -> dict[str, int]:
    statement = select(
        func.count(Asset.id),
        func.count(case((Asset.status == "active", 1))),
        func.count(case((Asset.status == "archived", 1))),
    ).where(Asset.user_id == user_id)

    total, active, archived = db.execute(statement).one()

    return {
        "total": int(total),
        "active": int(active),
        "archived": int(archived),
        "monitored": count_enabled_monitoring_for_user(db, user_id=user_id),
    }