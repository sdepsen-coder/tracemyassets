from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.match_record import (
    get_match_record_for_user,
    list_match_records,
    update_match_record,
)
from app.models.match_record import MatchRecord
from app.models.user import User
from app.schemas.asset import MatchRecordRead, MatchRecordUpdate


router = APIRouter(prefix="/matches", tags=["matches"])


ReviewStatus = Literal[
    "new",
    "reviewing",
    "confirmed",
    "dismissed",
    "archived",
]


def match_record_response(
    match_record: MatchRecord,
) -> MatchRecordRead:
    return MatchRecordRead(
        id=match_record.id,
        asset_id=match_record.asset_id,
        scan_job_id=match_record.scan_job_id,
        source_name=match_record.source_name,
        source_url=match_record.source_url,
        candidate_image_url=match_record.candidate_image_url,
        candidate_page_url=match_record.candidate_page_url,
        candidate_image_hash=match_record.candidate_image_hash,
        similarity_percent=match_record.similarity_percent,
        watermark_verified=match_record.watermark_verified,
        watermark_matches_reference=(
            match_record.watermark_matches_reference
        ),
        overall_signal=match_record.overall_signal,
        review_status=match_record.review_status,
        found_at=match_record.found_at,
        reviewed_at=match_record.reviewed_at,
        dismissed_at=match_record.dismissed_at,
        notes=match_record.notes,
        created_at=match_record.created_at,
        updated_at=match_record.updated_at,
    )


@router.get("", response_model=list[MatchRecordRead])
def read_matches(
    review_status: ReviewStatus | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MatchRecordRead]:
    records = list_match_records(
        db,
        user_id=user.id,
        review_status=review_status,
        skip=skip,
        limit=limit,
    )

    return [match_record_response(record) for record in records]
@router.patch("/{match_id}", response_model=MatchRecordRead)
def update_match(
    match_id: int,
    request: MatchRecordUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchRecordRead:
    match_record = get_match_record_for_user(
        db,
        match_id=match_id,
        user_id=user.id,
    )

    if match_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found.",
        )

    updated = update_match_record(
        db,
        match_record=match_record,
        review_status=request.review_status,
        notes=request.notes,
        update_notes="notes" in request.model_fields_set,
    )

    db.commit()
    db.refresh(updated)

    return match_record_response(updated)