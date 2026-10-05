from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.feedback import (
    clear_match_verdict,
    get_verdicts_for_matches,
    upsert_match_verdict,
)
from app.crud.match_record import (
    count_match_records_by_status,
    delete_match_records_for_user,
    get_match_record_for_user,
    list_match_records,
    update_match_record,
)
from app.models.user import User
from app.schemas.asset import MatchRecordRead, MatchRecordUpdate, MatchSummary
from app.schemas.feedback import MatchFeedbackRead, MatchFeedbackUpdate
from app.services.match_presentation import (
    build_match_record_response,
    deep_scan_job_ids,
)


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

    verdicts = get_verdicts_for_matches(
        db,
        user_id=user.id,
        match_ids=[record.id for record in records],
    )

    deep_jobs = deep_scan_job_ids(
        db, (record.scan_job_id for record in records)
    )

    return [
        build_match_record_response(
            record,
            plan_type=user.plan_type,
            feedback_verdict=verdicts.get(record.id),
            found_by_deep_scan=record.scan_job_id in deep_jobs,
        )
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

    verdicts = get_verdicts_for_matches(
        db,
        user_id=user.id,
        match_ids=[updated.id],
    )

    deep_jobs = deep_scan_job_ids(db, [updated.scan_job_id])

    return build_match_record_response(
        updated,
        plan_type=user.plan_type,
        feedback_verdict=verdicts.get(updated.id),
        found_by_deep_scan=updated.scan_job_id in deep_jobs,
    )


@router.put("/{match_id}/feedback", response_model=MatchFeedbackRead)
def set_match_feedback(
    match_id: int,
    request: MatchFeedbackUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchFeedbackRead:
    """
    Record the user's verdict on one match: useful, a false positive,
    or "not my work". Changing it later replaces the earlier verdict.
    """
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

    entry = upsert_match_verdict(
        db,
        user_id=user.id,
        match_record=match_record,
        verdict=request.verdict,
    )

    db.commit()

    return MatchFeedbackRead(match_id=match_id, verdict=entry.verdict)


@router.delete(
    "/{match_id}/feedback",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_match_feedback(
    match_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
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

    clear_match_verdict(db, user_id=user.id, match_id=match_id)
    db.commit()


class MatchBulkDelete(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=200)


class MatchBulkDeleteResult(BaseModel):
    deleted: int


@router.post("/delete", response_model=MatchBulkDeleteResult)
def delete_matches(
    payload: MatchBulkDelete,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MatchBulkDeleteResult:
    """Permanently delete several of the signed-in user's matches."""
    deleted = delete_match_records_for_user(
        db,
        user_id=user.id,
        match_ids=list(set(payload.ids)),
    )
    db.commit()

    return MatchBulkDeleteResult(deleted=deleted)


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(
    match_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Permanently delete one of the signed-in user's matches."""
    deleted = delete_match_records_for_user(
        db,
        user_id=user.id,
        match_ids=[match_id],
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found.",
        )

    db.commit()
