from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.scan_quota import get_manual_scan_usage

router = APIRouter(prefix="/usage", tags=["usage"])


class ManualScansRead(BaseModel):
    used: int
    # None means the plan has no monthly limit.
    limit: int | None
    remaining: int | None
    resets_on: date


class UsageRead(BaseModel):
    plan_type: str
    manual_scans: ManualScansRead


@router.get("", response_model=UsageRead)
def read_usage(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UsageRead:
    """What the plan allows this month and how much is left."""
    usage = get_manual_scan_usage(db, user)

    return UsageRead(
        plan_type=user.plan_type,
        manual_scans=ManualScansRead(
            used=usage.used,
            limit=usage.limit,
            remaining=usage.remaining,
            resets_on=usage.resets_on,
        ),
    )
