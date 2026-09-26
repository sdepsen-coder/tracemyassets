from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.match_record import (
    count_match_records_by_status,
    get_match_record_for_user,
    list_match_records,
    update_match_record,
)
from app.models.user import User
from app.schemas.asset import MatchRecordRead, MatchRecordUpdate, MatchSummary
from app.services.match_presentation import build_match_record_response


router = APIRouter(prefix="/matches", tags=["matches"])


ReviewStatus = Literal[
    "new",
    "reviewing",
    "confirmed",
    "dismissed",
    "archived",
]


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

    return [
        build_match_record_response(record, plan_type=user.plan_type)
        for record in records
    ]


@router.get("/summary", response_model=MatchSummary)
def read_match_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchSummary:
    counts = count_match_records_by_status(db, user_id=user.id)

    return MatchSummary(**counts)


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

    return build_match_record_response(updated, plan_type=user.plan_type)