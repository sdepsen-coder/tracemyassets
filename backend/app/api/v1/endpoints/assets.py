import json
import shutil
from dataclasses import asdict
from typing import Literal

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
from PIL import Image
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.plan_limits import get_plan_limits
from app.crud.asset import (
    create_asset,
    delete_asset,
    get_asset,
    get_asset_stats,
    get_assets,
    set_asset_archived,
)
from app.crud.monitoring import (
    count_enabled_monitoring_for_user,
    get_or_create_monitoring_preference,
    update_monitoring_preference,
)
from app.crud.scan_job import mark_scan_job_failed
from app.models.asset import Asset
from app.models.user import User
from app.schemas.asset import (
    AssetArchiveUpdate,
    AssetRead,
    AssetStats,
    CandidateVerificationRead,
    MonitoringPreferenceRead,
    MonitoringPreferenceUpdate,
    OrbComparisonRead,
    PHashComparisonRead,
    WatermarkPayloadRead,
AssetScanRead,
MatchRecordRead,
ScanJobRead,
)
from app.services.scan_runner import run_scan_for_asset
from app.services.match_presentation import build_match_record_response
from app.services.scheduler import last_completed_scan_at
from app.services.asset_paths import (
    asset_storage_directory,
    load_watermark_secret,
    original_file_path,
)
from app.services.visual_search_provider import get_configured_provider
from app.services.asset_ingestion import (
    DEFAULT_STORAGE_ROOT,
    MAX_UPLOAD_BYTES,
    StoredImage,
    UploadValidationError,
    ingest_image,
)
from app.services.visual_verification import (
    read_candidate_bytes,
    verify_candidate_image,
)
from app.services.watermark import WatermarkError, embed_watermark
from app.services.watermark_metadata import (
    save_verified_watermarked_png,
)


router = APIRouter(prefix="/assets", tags=["assets"])


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
        watermarked_url=(
            f"{base_url}/download-watermarked"
            if asset.watermarked_url
            else None
        ),
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found.",
        )

    return asset


def verification_response(
    *,
    asset_id: int,
    result,
) -> CandidateVerificationRead:
    payload = result.watermark_payload

    return CandidateVerificationRead(
        asset_id=asset_id,
        watermark_verified=result.watermark_matches_reference,
        watermark_matches_reference=result.watermark_matches_reference,
        watermark_payload=(
            WatermarkPayloadRead(
                asset_id=payload.asset_id,
                user_id=payload.user_id,
                timestamp=payload.timestamp,
                nonce=payload.nonce,
            )
            if payload is not None
            else None
        ),
        phash=PHashComparisonRead(
            reference_hash=result.reference_phash,
            candidate_hash=result.candidate_phash,
            hamming_distance=result.phash_hamming_distance,
            similarity_percent=result.phash_similarity_percent,
        ),
        orb=OrbComparisonRead(
            reference_keypoints=result.orb.reference_keypoints,
            candidate_keypoints=result.orb.candidate_keypoints,
            good_matches=result.orb.good_matches,
            homography_inliers=result.orb.homography_inliers,
            inlier_ratio_percent=result.orb.inlier_ratio_percent,
        ),
        overall_signal=result.overall_signal,
        review_recommended=result.review_recommended,
    )


def monitoring_response(db: Session, preference) -> MonitoringPreferenceRead:
    return MonitoringPreferenceRead(
        id=preference.id,
        asset_id=preference.asset_id,
        enabled=preference.enabled,
        alert_threshold_percent=preference.alert_threshold_percent,
        scan_frequency=preference.scan_frequency,
        last_scan_at=last_completed_scan_at(db, preference.asset_id),
        created_at=preference.created_at,
        updated_at=preference.updated_at,
    )
def scan_job_response(scan_job) -> ScanJobRead:
    return ScanJobRead(
        id=scan_job.id,
        asset_id=scan_job.asset_id,
        provider=scan_job.provider,
        status=scan_job.status,
        started_at=scan_job.started_at,
        completed_at=scan_job.completed_at,
        candidate_count=scan_job.candidate_count,
        match_count=scan_job.match_count,
        error_message=scan_job.error_message,
        created_at=scan_job.created_at,
        updated_at=scan_job.updated_at,
    )


@router.get("/stats", response_model=AssetStats)
def read_asset_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    return get_asset_stats(db, user_id=user.id)


@router.get("", response_model=list[AssetRead])
def list_assets(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    status_filter: Literal["active", "archived", "all"] = Query(
        default="active", alias="status"
    ),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assets = get_assets(
        db,
        user_id=user.id,
        skip=skip,
        limit=limit,
        status=None if status_filter == "all" else status_filter,
    )

    return [asset_response(asset) for asset in assets]


@router.patch("/{asset_id}/archive", response_model=AssetRead)
def update_asset_archived(
    asset_id: int,
    request: AssetArchiveUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = require_owned_asset(
        db,
        asset_id=asset_id,
        user_id=user.id,
    )

    asset = set_asset_archived(db, asset=asset, archived=request.archived)

    db.commit()

    return asset_response(asset)


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_asset_permanently(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete an artwork, active or archived: its match
    records, scan jobs, monitoring preference, database row, and
    on-disk files.

    Not gated on archive status -- archiving is a separate, reversible
    "pause" action, unrelated to this permanent one. The client-side
    confirm step is the only safety net against an accidental delete,
    deliberately kept to one click of friction rather than forcing an
    archive-then-delete sequence a user has to discover first.
    """
    asset = require_owned_asset(
        db,
        asset_id=asset_id,
        user_id=user.id,
    )

    # Resolved before the row is deleted, since it is derived from
    # asset.original_url.
    storage_directory = asset_storage_directory(asset)

    delete_asset(db, asset=asset)
    db.commit()

    # Best-effort: the database is already the source of truth once
    # committed, so a filesystem cleanup failure should not surface
    # as an error to the user (the files may already be gone, e.g.
    # lost to a redeploy before the persistent volume was mounted).
    shutil.rmtree(storage_directory, ignore_errors=True)


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

        # create_asset() flushes to obtain the ID, but does not commit.
        asset = create_asset(
            db,
            user_id=user.id,
            title=clean_title,
            original_reference=original_reference,
            phash_value=stored.phash_value,
        )

        secret = load_watermark_secret()
        watermarked_path = (
            stored.original_path.parent / "watermarked.png"
        )

        with Image.open(stored.original_path) as original_img:
            result = embed_watermark(
                original_img,
                asset_id=asset.id,
                user_id=user.id,
                secret=secret,
            )

            try:
                # Save metadata and verify the actual saved PNG.
                save_verified_watermarked_png(
                    result,
                    watermarked_path,
                    secret=secret,
                    original_phash=stored.phash_value,
                )

                # Store a private storage reference, not the API URL.
                asset.watermarked_url = (
                    f"{stored.storage_key}/watermarked.png"
                )

                asset.watermark_payload = json.dumps(
                    asdict(result.payload),
                    ensure_ascii=False,
                )
            finally:
                result.image.close()

        response = asset_response(asset)
        db.commit()

        return response

    except (UploadValidationError, WatermarkError) as exc:
        db.rollback()

        if stored is not None:
            shutil.rmtree(
                stored.original_path.parent,
                ignore_errors=True,
            )

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


@router.post(
    "/{asset_id}/verify-candidate",
    response_model=CandidateVerificationRead,
)
def verify_candidate(
    asset_id: int,
    candidate: UploadFile = File(),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compare a temporary candidate upload with one owned registered artwork.

    The candidate file is processed in memory only and is not added to
    permanent asset storage.
    """
    try:
        asset = require_owned_asset(
            db,
            asset_id=asset_id,
            user_id=user.id,
        )

        if candidate.size is not None and candidate.size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Candidate image size must not exceed 25 MiB.",
            )

        candidate.file.seek(0)
        candidate_content = read_candidate_bytes(candidate.file)

        result = verify_candidate_image(
            reference_path=original_file_path(asset),
            reference_phash=asset.phash_value,
            expected_asset_id=asset.id,
            expected_user_id=user.id,
            candidate_content=candidate_content,
            watermark_secret=load_watermark_secret(),
        )

        return verification_response(
            asset_id=asset.id,
            result=result,
        )

    except UploadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except WatermarkError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    finally:
        candidate.file.close()
@router.post(
    "/{asset_id}/scan",
    response_model=AssetScanRead,
)
def scan_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Run a monitoring scan for one owned artwork.

    The discovery provider is selected by VISUAL_SEARCH_PROVIDER (see
    app.core.config); it defaults to a fake/demo provider that does
    not scan the public web. Whichever provider is configured, every
    discovered candidate is still re-verified through our own
    pHash/watermark/ORB pipeline before becoming a match record --
    see get_configured_provider() and verify_candidate_image().
    """
    asset = require_owned_asset(
        db,
        asset_id=asset_id,
        user_id=user.id,
    )

    preference = get_or_create_monitoring_preference(
        db,
        asset_id=asset.id,
    )

    try:
        provider = get_configured_provider()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    reference_path = original_file_path(asset)
    watermarked_path = (
        reference_path.parent / "watermarked.png"
        if asset.watermarked_url
        else None
    )

    scan_job = None

    try:
        outcome = run_scan_for_asset(
            db,
            asset=asset,
            user_id=user.id,
            preference=preference,
            reference_path=reference_path,
            watermarked_path=watermarked_path,
            watermark_secret=load_watermark_secret(),
            provider=provider,
        )
        scan_job = outcome.scan_job

        response = AssetScanRead(
            asset_id=asset.id,
            provider=outcome.provider_name,
            threshold_percent=preference.alert_threshold_percent,
            scan_job=scan_job_response(outcome.scan_job),
            matches=[
                build_match_record_response(
                    match_record, plan_type=user.plan_type
                )
                for match_record in outcome.matches
            ],
        )

        db.commit()

        return response

    except Exception as exc:
        db.rollback()

        if scan_job is not None:
            # Recreate a short-lived transaction to persist the failed
            # status.
            try:
                failed_job = db.merge(scan_job)
                mark_scan_job_failed(
                    db,
                    failed_job,
                    error_message=str(exc),
                )
                db.commit()
            except Exception:
                db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The scan could not be completed.",
        ) from exc

@router.get(
    "/{asset_id}/monitoring",
    response_model=MonitoringPreferenceRead,
)
def read_asset_monitoring(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = require_owned_asset(
        db,
        asset_id=asset_id,
        user_id=user.id,
    )

    preference = get_or_create_monitoring_preference(
        db,
        asset_id=asset.id,
    )

    db.commit()

    return monitoring_response(db, preference)


@router.put(
    "/{asset_id}/monitoring",
    response_model=MonitoringPreferenceRead,
)
def update_asset_monitoring(
    asset_id: int,
    request: MonitoringPreferenceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = require_owned_asset(
        db,
        asset_id=asset_id,
        user_id=user.id,
    )

    limits = get_plan_limits(user.plan_type)

    if request.scan_frequency not in limits.allowed_scan_frequencies:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"The {user.plan_type} plan does not include "
                f"{request.scan_frequency} scans. Allowed: "
                f"{', '.join(sorted(limits.allowed_scan_frequencies))}."
            ),
        )

    if request.enabled:
        existing_preference = get_or_create_monitoring_preference(
            db,
            asset_id=asset.id,
        )

        if not existing_preference.enabled:
            enabled_count = count_enabled_monitoring_for_user(
                db,
                user_id=user.id,
                exclude_asset_id=asset.id,
            )

            if enabled_count >= limits.max_monitored_assets:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"The {user.plan_type} plan allows monitoring "
                        f"up to {limits.max_monitored_assets} asset(s). "
                        "Disable monitoring on another asset first, or "
                        "upgrade your plan."
                    ),
                )

    preference = update_monitoring_preference(
        db,
        asset_id=asset.id,
        enabled=request.enabled,
        alert_threshold_percent=request.alert_threshold_percent,
        scan_frequency=request.scan_frequency,
    )

    db.commit()

    return monitoring_response(db, preference)


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


@router.get("/{asset_id}/download-watermarked")
def download_watermarked_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = require_owned_asset(db, asset_id, user.id)

    if not asset.watermarked_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watermarked file not found.",
        )

    root = DEFAULT_STORAGE_ROOT.resolve()
    path = (root / asset.watermarked_url).resolve()

    original = original_file_path(asset)
    expected_path = original.parent / "watermarked.png"

    if (
        not path.is_relative_to(root)
        or path != expected_path
        or not path.is_file()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watermarked file not found.",
        )

    return FileResponse(
        path=path,
        media_type="image/png",
        filename=f"asset-{asset.id}-watermarked.png",
        headers=PRIVATE_FILE_HEADERS,
    )