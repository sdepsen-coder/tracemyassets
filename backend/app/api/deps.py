from collections.abc import Generator

import time

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.browser_session import (
    SAFE_METHODS,
    SESSION_COOKIE_NAME,
    require_trusted_origin,
)
from app.core.config import settings
from app.core.security import (
    decode_access_token_claims,
    decode_access_token_details,
)
from app.services.session_cutoff import session_is_revoked
from app.db.session import SessionLocal
from app.models.user import User
from app.models.user_suspension import UserSuspension


bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _read_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    token: str | None = None

    if credentials is not None:
        token = credentials.credentials
    else:
        token = request.cookies.get(SESSION_COOKIE_NAME)

        if token and request.method not in SAFE_METHODS:
            require_trusted_origin(request)

    return token


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    token = _read_token(request, credentials)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id, issued_at = decode_access_token_claims(token)
    user = db.get(User, user_id)

    # A password reset or "sign out of all devices" ends older sessions.
    if user is None or session_is_revoked(db, user_id, issued_at):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if db.get(UserSuspension, user.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is suspended.",
        )

    return user


def is_admin_email(email: str) -> bool:
    return email.strip().lower() in settings.admin_emails


def get_admin_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    user: User = Depends(get_current_user),
) -> User:
    """
    Only the people in ADMIN_EMAILS get past here. Everyone else is told
    the page does not exist, so the admin area cannot even be discovered.
    An admin must also have signed in with Google recently.
    """
    if not is_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found.",
        )

    if settings.admin_require_google:
        token = _read_token(request, credentials) or ""
        _user_id, issued_at, via = decode_access_token_details(token)
        fresh = time.time() - issued_at <= settings.admin_session_minutes * 60

        if via != "google" or not fresh:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="admin_google_signin_required",
            )

    return user
