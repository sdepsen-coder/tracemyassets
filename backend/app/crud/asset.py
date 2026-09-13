from sqlalchemy import select
from sqlalchemy.orm import Session

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


def get_assets(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
) -> list[Asset]:
    statement = (
        select(Asset)
        .where(Asset.user_id == user_id)
        .order_by(Asset.id.desc())
        .offset(skip)
        .limit(limit)
    )

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