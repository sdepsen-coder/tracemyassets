"""
Sign in with Google (OAuth 2.0 authorization-code flow with PKCE).

  GET /auth/providers         which sign-in options are switched on
  GET /auth/google/start      send the browser to Google
  GET /auth/google/callback   Google sends the browser back here

The app only ever learns the person's verified email address. A Google
account whose email is not verified is refused. If an account with that
email already exists (for example created with a password), signing in
with Google opens that same account: Google has verified the person owns
the address.

Whatever goes wrong, the browser is sent back to the home page with
?auth_error=... so the sign-in form can say so; no error page of ours is
ever shown, and nothing from Google's reply is passed on to the page.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.browser_session import COOKIE_SECURE, set_session_cookie
from app.core.config import settings
from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.user_suspension import UserSuspension
from app.services import user_events

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger("tracemyassets.auth.google")

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

STATE_COOKIE = "tma_oauth_state"
VERIFIER_COOKIE = "tma_oauth_verifier"
COOKIE_PATH = "/api/v1/auth/google"
COOKIE_MAX_AGE = 600
HTTP_TIMEOUT = 10.0


class ProvidersRead(BaseModel):
    google: bool


def google_enabled() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def redirect_uri() -> str:
    return f"{settings.frontend_url}/api/v1/auth/google/callback"


def _failure(reason: str) -> RedirectResponse:
    response = RedirectResponse(
        f"/?auth_error={reason}", status_code=302
    )
    _clear_flow_cookies(response)
    return response


def _clear_flow_cookies(response: RedirectResponse) -> None:
    for name in (STATE_COOKIE, VERIFIER_COOKIE):
        response.delete_cookie(
            key=name,
            path=COOKIE_PATH,
            secure=COOKIE_SECURE,
            httponly=True,
            samesite="lax",
        )


def _set_flow_cookie(response: RedirectResponse, name: str, value: str) -> None:
    response.set_cookie(
        key=name,
        value=value,
        max_age=COOKIE_MAX_AGE,
        path=COOKIE_PATH,
        secure=COOKIE_SECURE,
        httponly=True,
        samesite="lax",
    )


def _challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


@router.get("/providers", response_model=ProvidersRead)
def read_providers() -> ProvidersRead:
    return ProvidersRead(google=google_enabled())


@router.get("/google/start")
def google_start() -> RedirectResponse:
    if not google_enabled():
        return _failure("google_unavailable")

    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)

    query = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": redirect_uri(),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": _challenge(verifier),
            "code_challenge_method": "S256",
            "prompt": "select_account",
        }
    )

    response = RedirectResponse(f"{AUTHORIZE_URL}?{query}", status_code=302)
    _set_flow_cookie(response, STATE_COOKIE, state)
    _set_flow_cookie(response, VERIFIER_COOKIE, verifier)
    return response


def _find_or_create_user(db: Session, email: str) -> tuple[User, bool]:
    """The account for this email, and whether it was just created."""
    user = db.scalar(select(User).where(User.email == email))

    if user is not None:
        return user, False

    # Google accounts have no password here. The stored hash is of a
    # random value nobody knows, so password sign-in is impossible until
    # the person uses "Forgot your password?" to choose one.
    user = User(
        email=email,
        hashed_password=hash_password(secrets.token_urlsafe(48)),
        plan_type="Free",
    )
    db.add(user)

    created = True

    try:
        db.commit()
    except IntegrityError:
        # Created by a simultaneous request: use that one.
        db.rollback()
        created = False
        user = db.scalar(select(User).where(User.email == email))

        if user is None:
            raise

    db.refresh(user)
    return user, created


@router.get("/google/callback")
def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not google_enabled():
        return _failure("google_unavailable")

    if error:
        # The person pressed "Cancel" at Google, or Google refused.
        return _failure("google_cancelled")

    expected_state = request.cookies.get(STATE_COOKIE)
    verifier = request.cookies.get(VERIFIER_COOKIE)

    if (
        not code
        or not state
        or not expected_state
        or not verifier
        or not secrets.compare_digest(state, expected_state)
    ):
        return _failure("google_failed")

    try:
        token_response = httpx.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": redirect_uri(),
                "grant_type": "authorization_code",
                "code_verifier": verifier,
            },
            timeout=HTTP_TIMEOUT,
        )

        if token_response.status_code != 200:
            logger.warning(
                "Google token exchange refused: HTTP %s",
                token_response.status_code,
            )
            return _failure("google_failed")

        access_token = token_response.json().get("access_token")

        if not isinstance(access_token, str) or not access_token:
            return _failure("google_failed")

        info_response = httpx.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=HTTP_TIMEOUT,
        )

        if info_response.status_code != 200:
            logger.warning(
                "Google userinfo refused: HTTP %s", info_response.status_code
            )
            return _failure("google_failed")

        info = info_response.json()
    except (httpx.HTTPError, ValueError):
        logger.exception("Google sign-in request failed.")
        return _failure("google_failed")

    email = info.get("email")

    if (
        not isinstance(email, str)
        or "@" not in email
        or len(email) > 255
        or info.get("email_verified") is not True
    ):
        return _failure("google_email")

    user, created = _find_or_create_user(db, email.strip().lower())

    if db.get(UserSuspension, user.id) is not None:
        return _failure("account_suspended")

    user_events.record_event(
        db,
        request,
        user_events.GOOGLE_SIGNUP if created else user_events.GOOGLE_LOGIN,
        user_id=user.id,
        email=user.email,
    )

    response = RedirectResponse("/", status_code=302)
    set_session_cookie(
        response, create_access_token(user.id, via="google")
    )
    _clear_flow_cookies(response)

    logger.info("Google sign-in for user_id=%s", user.id)

    return response
