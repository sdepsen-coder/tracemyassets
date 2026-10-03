from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.crud.feedback import (
    MAX_FEEDBACK_ENTRIES_PER_DAY,
    count_feedback_since,
    create_feedback,
)
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackRead


router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post(
    "",
    response_model=FeedbackRead,
    status_code=status.HTTP_201_CREATED,
)
def submit_feedback(
    request: FeedbackCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackRead:
    if not request.message and not request.answers:
        raise HTTPException(
            status_code=422,
            detail="Please write a message or answer at least one question.",
        )

    recent = count_feedback_since(
        db,
        user_id=user.id,
        since=datetime.now(timezone.utc) - timedelta(days=1),
    )

    if recent >= MAX_FEEDBACK_ENTRIES_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You have sent a lot of feedback today. Thank you -- please try again tomorrow.",
        )

    entry = create_feedback(
        db,
        user_id=user.id,
        kind=request.kind,
        message=request.message,
        answers=request.answers,
    )

    db.commit()

    return FeedbackRead(id=entry.id)
