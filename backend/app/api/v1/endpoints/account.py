import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from app.api.deps import _read_token, bearer_scheme, get_current_user, get_db
from app.api.deps import is_admin_email
from app.core.browser_session import clear_session_cookie, require_trusted_origin
from app.core.security import decode_access_token_details, verify_password
from app.models.user import User
from app.models.user_event import UserEvent
from app.services import user_events
from app.services.account_deletion import delete_account, remove_folders
from app.services.account_export import build_export

router = APIRouter(prefix="/account", tags=["account"])

EXPORTS_PER_HOUR = 3

# A Google sign-in this recent counts as proof it is really the owner.
RECENT_GOOGLE_SIGNIN_SECONDS = 30 * 60


def _remove_file(path: Path) -> None:
    path.unlink(missing_ok=True)


@router.get("/export")
def export_my_data(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """A ZIP with everything we hold about this account."""
    since = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = (
        db.scalar(
            select(func.count(UserEvent.id)).where(
                UserEvent.user_id == user.id,
                UserEvent.event_type == user_events.DATA_EXPORT,
                UserEvent.created_at >= since,
            )
        )
        or 0
    )

    if recent >= EXPORTS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You have downloaded your data several times in the last hour. Please try again later.",
        )

    path = build_export(db, user)

    user_events.record_event(
        db,
        request,
        user_events.DATA_EXPORT,
        user_id=user.id,
        email=user.email,
    )

    return FileResponse(
        path,
        media_type="application/zip",
        filename="tracemyassets-my-data.zip",
        headers={"Cache-Control": "no-store"},
        background=BackgroundTask(_remove_file, path),
    )


class DeleteAccountRequest(BaseModel):
    confirm_email: str = Field(min_length=3, max_length=255)
    # Empty for people who only ever signed in with Google.
    password: str = Field(default="", max_length=200)


@router.post(
    "/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_trusted_origin)],
)
def delete_my_account(
    payload: DeleteAccountRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """
    Permanently delete the account, its artworks and files. Needs the
    email typed again, and proof it is the owner: the password, or a
    Google sign-in from the last half hour.
    """
    if is_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator accounts cannot be deleted here.",
        )

    if payload.confirm_email.strip().lower() != user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The email address does not match this account.",
        )

    proven = bool(payload.password) and verify_password(
        payload.password, user.hashed_password
    )

    if not proven:
        token = _read_token(request, credentials) or ""
        _uid, issued_at, via = decode_access_token_details(token)
        recent_google = (
            via == "google"
            and time.time() - issued_at <= RECENT_GOOGLE_SIGNIN_SECONDS
        )

        if not recent_google:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "reauth_required"
                    if not payload.password
                    else "Wrong password."
                ),
            )

    folders = delete_account(db, user)
    remove_folders(folders)

    user_events.record_event(
        db,
        request,
        user_events.ACCOUNT_DELETED,
        detail="account deleted by its owner",
    )

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response
