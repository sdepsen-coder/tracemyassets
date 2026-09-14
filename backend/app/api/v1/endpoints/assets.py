import shutil
from app.crud.asset import get_asset_stats
from app.schemas.asset import AssetStats
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.asset import create_asset, get_asset, get_assets
from app.models.asset import Asset
from app.models.user import User
from app.schemas.asset import AssetRead
from app.services.asset_ingestion import (
    DEFAULT_STORAGE_ROOT,
    MAX_UPLOAD_BYTES,
    StoredImage,
    UploadValidationError,
    ingest_image,
)


router = APIRouter(prefix="/assets", tags=["assets"])
@router.get("/stats", response_model=AssetStats)
def read_asset_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return get_asset_stats(db, user_id=user.id)


PRIVATE_FILE_HEADERS = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
}


def asset_response(asset: Asset) -> AssetRead:
    base_url = f"/api/v1/assets/{asset.id}"

    return AssetRead(
        id=asset.id,
        user_id=asset.user_id,
        title=asset.title,
        original_url=f"{base_url}/download",
        thumbnail_url=f"{base_url}/thumbnail",
        # Watermark generation is not implemented in this flow yet.
        watermarked_url=None,
        phash_value=asset.phash_value,
        status=asset.status,
        created_at=asset.created_at,
    )


def require_owned_asset(
    db: Session,
    asset_id: int,
    user_id: int,
) -> Asset:
    asset = get_asset(db, asset_id, user_id)

    if asset is None:
        # Do not reveal whether another user's asset exists.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found.",
        )

    return asset


def original_file_path(asset: Asset) -> Path:
    root = DEFAULT_STORAGE_ROOT.resolve()
    path = (root / asset.original_url).resolve()

    if (
        not path.is_relative_to(root)
        or path.name not in {
            "original.png",
            "original.jpg",
            "original.webp",
        }
        or not path.is_file()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset file not found.",
        )

    return path


@router.get("", response_model=list[AssetRead])
def list_assets(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assets = get_assets(
        db,
        user_id=user.id,
        skip=skip,
        limit=limit,
    )
    return [asset_response(asset) for asset in assets]


@router.post(
    "",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_asset(
    title: str = Form(min_length=1, max_length=255),
    file: UploadFile = File(),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stored: StoredImage | None = None

    try:
        clean_title = title.strip()
        if not clean_title:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Title must not be blank.",
            )

        if file.size is not None and file.size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size must not exceed 25 MiB.",
            )

        file.file.seek(0)
        stored = ingest_image(file.file)

        original_reference = (
            f"{stored.storage_key}/{stored.original_path.name}"
        )

        asset = create_asset(
            db,
            user_id=user.id,
            title=clean_title,
            original_reference=original_reference,
            phash_value=stored.phash_value,
        )

        # Prepare the response before commit so serialization errors
        # do not leave a committed record with deleted files.
        response = asset_response(asset)
        db.commit()

        return response

    except UploadValidationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    except Exception:
        db.rollback()

        if stored is not None:
            shutil.rmtree(
                stored.original_path.parent,
                ignore_errors=True,
            )

        raise

    finally:
        file.file.close()


@router.get("/{asset_id}", response_model=AssetRead)
def read_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = require_owned_asset(db, asset_id, user.id)
    return asset_response(asset)


@router.get("/{asset_id}/download")
def download_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = require_owned_asset(db, asset_id, user.id)
    path = original_file_path(asset)

    media_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".webp": "image/webp",
    }

    return FileResponse(
        path=path,
        media_type=media_types[path.suffix],
        filename=f"asset-{asset.id}{path.suffix}",
        headers=PRIVATE_FILE_HEADERS,
    )


@router.get("/{asset_id}/thumbnail")
def download_thumbnail(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = require_owned_asset(db, asset_id, user.id)
    original = original_file_path(asset)
    thumbnail = (original.parent / "thumbnail.png").resolve()

    if (
        not thumbnail.is_relative_to(DEFAULT_STORAGE_ROOT.resolve())
        or not thumbnail.is_file()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found.",
        )

    return FileResponse(
        path=thumbnail,
        media_type="image/png",
        headers=PRIVATE_FILE_HEADERS,
    )