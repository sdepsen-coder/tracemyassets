from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.asset import (
    create_asset,
    delete_asset,
    get_asset,
    get_asset_by_tag,
    get_assets,
    update_asset,
)
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[AssetRead])
def list_assets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return get_assets(db, skip=skip, limit=limit)


@router.get("/{asset_id}", response_model=AssetRead)
def read_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")
    return asset


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
def create_new_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    existing = get_asset_by_tag(db, payload.tag)
    if existing is not None:
        raise HTTPException(status_code=409, detail="This tag is already in use.")
    return create_asset(db, payload)


@router.put("/{asset_id}", response_model=AssetRead)
def update_existing_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
):
    asset = get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")

    if payload.tag is not None and payload.tag != asset.tag:
        existing = get_asset_by_tag(db, payload.tag)
        if existing is not None and existing.id != asset_id:
            raise HTTPException(status_code=409, detail="This tag is already in use.")

    return update_asset(db, asset, payload)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found.")
    delete_asset(db, asset)
    return None