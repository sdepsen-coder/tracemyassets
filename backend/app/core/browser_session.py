from fastapi import HTTPException, Request, Response, status

from app.core.config import settings
from app.core.security import TOKEN_TTL_SECONDS


SESSION_COOKIE_NAME = "tma_session"
SESSION_COOKIE_PATH = "/api/v1"

COOKIE_SECURE = settings.environment.strip().lower() not in {
    "development",
    "test",
}

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def require_trusted_origin(request: Request) -> None:
    origin = request.headers.get("origin")

    if not origin or origin not in settings.allowed_origins:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Request origin is not allowed.",
        )


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=TOKEN_TTL_SECONDS,
        path=SESSION_COOKIE_PATH,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "private, no-store"


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path=SESSION_COOKIE_PATH,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "private, no-store"