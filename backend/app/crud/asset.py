from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetUpdate


def get_asset(db: Session, asset_id: int) -> Asset | None:
    return db.get(Asset, asset_id)


def get_asset_by_tag(db: Session, tag: str) -> Asset | None:
    stmt = select(Asset).where(Asset.tag == tag)
    return db.scalar(stmt)


def get_assets(db: Session, skip: int = 0, limit: int = 100) -> list[Asset]:
    stmt = select(Asset).order_by(Asset.id.desc()).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def create_asset(db: Session, asset_in: AssetCreate) -> Asset:
    asset = Asset(**asset_in.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def update_asset(db: Session, asset: Asset, asset_in: AssetUpdate) -> Asset:
    data = asset_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(asset, field, value)

    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(db: Session, asset: Asset) -> None:
    db.delete(asset)
    db.commit()