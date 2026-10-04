from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.credits import (
    DEEP_SCAN_COST,
    get_credit_summary,
    recent_entries,
)

router = APIRouter(prefix="/credits", tags=["credits"])


class CreditEntryRead(BaseModel):
    id: int
    delta: int
    reason: Literal["welcome", "grant", "deep_scan", "refund"]
    created_at: datetime


class CreditsRead(BaseModel):
    balance: int
    deep_scan_cost: int
    recent: list[CreditEntryRead]


@router.get("", response_model=CreditsRead)
def read_credits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreditsRead:
    """The user's deep scan credit balance and its latest movements."""
    balance = get_credit_summary(db, user.id)

    return CreditsRead(
        balance=balance,
        deep_scan_cost=DEEP_SCAN_COST,
        recent=[
            CreditEntryRead(
                id=entry.id,
                delta=entry.delta,
                reason=entry.reason,
                created_at=entry.created_at,
            )
            for entry in recent_entries(db, user.id)
        ],
    )
