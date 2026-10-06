import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from html import escape
from typing import Literal

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, is_admin_email
from app.core.browser_session import (
    SESSION_COOKIE_NAME,
    clear_session_cookie,
    require_trusted_origin,
    set_session_cookie,
)
from app.core.config import settings
from app.core.password_policy import (
    MAX_PASSWORD_LENGTH,
    check_password,
)
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    RENEW_AFTER_SECONDS,
    TOKEN_TTL_SECONDS,
    create_access_token,
    decode_access_token,
    get_auth_secret,
    hash_password,
    token_age_seconds,
    verify_password,
)
from app.models.password_reset import PasswordResetToken
from app.models.signup_key import SignupKey
from app.models.user import User
from app.models.user_suspension import UserSuspension
from app.services import email_verification, user_events
from app.services.abuse_limits import (
    check_login_allowed,
    check_signup_allowed,
    reset_requests_limited,
)
from app.services.email_identity import canonical_email, is_blocked_domain
from app.services.email_service import send_email
from app.services.session_cutoff import revoke_sessions


router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger("tracemyassets.auth")

RESET_TOKEN_TTL = timedelta(hours=1)
MAX_RESET_REQUESTS_PER_HOUR = 3


class RegisterRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    id: int
    email: str
    plan_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MeRead(UserRead):
    # Lets the app show the "Admin" link; the admin pages themselves are
    # protected on the server whatever this says.
    is_admin: bool = False
    # False only while EMAIL_VERIFICATION_REQUIRED is on and the address
    # has not been confirmed yet.
    email_verified: bool = True


class MessageRead(BaseModel):
    message: str


class TokenRead(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int = TOKEN_TTL_SECONDS


def normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> User:
    # Avoid creating accounts while authentication is misconfigured.
    get_auth_secret()

    email = normalize_email(str(payload.email))

    if is_blocked_domain(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Please use a permanent email address. Temporary mail "
                "services are not accepted."
            ),
        )

    check_signup_allowed(db, request)

    refusal = check_password(payload.password, email=email)

    if refusal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=refusal,
        )

    existing = db.scalar(
        select(User).where(User.email == email)
    )

    mailbox = canonical_email(email)

    if existing is not None or db.get(SignupKey, mailbox) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        plan_type="Free",
    )

    db.add(user)

    try:
        db.flush()
        db.add(SignupKey(canonical_email=mailbox, user_id=user.id))
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account could not be created.",
        ) from exc

    db.refresh(user)

    user_events.record_event(
        db,
        request,
        user_events.REGISTER,
        user_id=user.id,
        email=user.email,
    )

    if settings.email_verification_required:
        token = email_verification.issue_token(db, user)

        if token is not None:
            background.add_task(
                email_verification.send_verification_email,
                user.email,
                token,
            )

    return user


@router.post("/login", response_model=TokenRead)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenRead:
    get_auth_secret()

    email = normalize_email(str(payload.email))

    check_login_allowed(db, request, email)

    user = db.scalar(
        select(User).where(User.email == email)
    )

    stored_hash = (
        user.hashed_password
        if user is not None
        else DUMMY_PASSWORD_HASH
    )

    valid_password = verify_password(
        payload.password,
        stored_hash,
    )

    if user is None or not valid_password:
        user_events.record_event(
            db,
            request,
            user_events.LOGIN_FAILED,
            user_id=user.id if user is not None else None,
            email=email,
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if db.get(UserSuspension, user.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is suspended.",
        )

    user_events.record_event(
        db,
        request,
        user_events.LOGIN,
        user_id=user.id,
        email=user.email,
    )

    return TokenRead(
        access_token=create_access_token(user.id)
    )


@router.get("/me", response_model=MeRead)
def read_current_user(
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeRead:
    # Sliding session: the app asks "who am I" every minute while open, so
    # an older browser session is quietly renewed here. Cookie sessions
    # only; bearer-token callers manage their own tokens.
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)

    if cookie_token and "authorization" not in request.headers:
        age = token_age_seconds(cookie_token)

        if age is not None and age > RENEW_AFTER_SECONDS:
            set_session_cookie(response, create_access_token(user.id))

            user_events.record_event(
                db,
                request,
                user_events.SESSION_RENEWED,
                user_id=user.id,
                email=user.email,
            )

    return MeRead.model_validate(user).model_copy(
        update={
            "is_admin": is_admin_email(user.email),
            "email_verified": email_verification.is_verified(db, user.id),
        }
    )


@router.post(
    "/session",
    response_model=UserRead,
    dependencies=[Depends(require_trusted_origin)],
)
def create_browser_session(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    # Reuse the existing credential verification and token generation.
    result = login(payload=payload, request=request, db=db)

    user_id = decode_access_token(result.access_token)
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    set_session_cookie(response, result.access_token)
    return user


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_trusted_origin)],
)
def end_browser_session() -> Response:
    # Allow logout even when the existing cookie has expired.
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response


@router.post(
    "/logout-all",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_trusted_origin)],
)
def end_all_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    # Every session issued so far, on every device, including this one.
    revoke_sessions(db, user.id)
    db.commit()

    user_events.record_event(
        db,
        request,
        user_events.LOGOUT_ALL,
        user_id=user.id,
        email=user.email,
    )

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_session_cookie(response)
    return response


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)


@router.post(
    "/send-verification",
    response_model=MessageRead,
    dependencies=[Depends(require_trusted_origin)],
)
def send_verification(
    background: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageRead:
    """Send (or re-send) the email-confirmation link."""
    if email_verification.is_verified(db, user.id):
        return MessageRead(message="Your email address is already confirmed.")

    token = email_verification.issue_token(db, user)

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "We have already sent several emails. Please check your "
                "inbox and spam folder, or try again in an hour."
            ),
        )

    background.add_task(
        email_verification.send_verification_email, user.email, token
    )

    return MessageRead(message="We have sent you a confirmation email.")


@router.post(
    "/verify-email",
    response_model=MessageRead,
    dependencies=[Depends(require_trusted_origin)],
)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageRead:
    """Works from any browser: the link itself is the proof."""
    user = email_verification.confirm_token(db, payload.token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This confirmation link is invalid or has expired. Sign "
                "in and ask for a new one."
            ),
        )

    user_events.record_event(
        db,
        request,
        user_events.EMAIL_VERIFIED,
        user_id=user.id,
        email=user.email,
    )

    return MessageRead(message="Your email address is confirmed.")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _send_reset_email(to_email: str, token: str) -> None:
    link = f"{settings.frontend_url}/reset-password?token={token}"

    text = (
        "Someone asked to reset the password for your TraceMyAssets "
        f"account.\n\nChoose a new password (the link works for 1 hour, "
        f"once): {link}\n\nIf this was not you, ignore this email. Your "
        "password stays as it is."
    )

    html = (
        "<div style=\"font-family:Arial,Helvetica,sans-serif;"
        "max-width:520px;line-height:1.5;color:#1a1a1a\">"
        "<p>Someone asked to reset the password for your TraceMyAssets "
        "account.</p>"
        f"<p><a href=\"{escape(link, quote=True)}\">Choose a new "
        "password</a> (the link works for 1 hour, once).</p>"
        "<p style=\"color:#666;font-size:13px\">If this was not you, "
        "ignore this email. Your password stays as it is.</p></div>"
    )

    send_email(
        to=to_email,
        subject="Reset your TraceMyAssets password",
        html=html,
        text=text,
    )


@router.post(
    "/forgot-password",
    response_model=MessageRead,
    dependencies=[Depends(require_trusted_origin)],
)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> MessageRead:
    """
    Always answers the same way, whether or not the account exists, so the
    form cannot be used to find out who has an account.
    """
    get_auth_secret()

    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == email))

    # Counted before this request is logged, so the limit is exact.
    too_many_from_here = reset_requests_limited(db, request)

    user_events.record_event(
        db,
        request,
        user_events.PASSWORD_RESET_REQUESTED,
        user_id=user.id if user is not None else None,
        email=email,
    )

    if user is not None:
        now = datetime.now(timezone.utc)

        recent = db.scalar(
            select(func.count(PasswordResetToken.id)).where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.created_at > now - timedelta(hours=1),
            )
        )

        if (recent or 0) < MAX_RESET_REQUESTS_PER_HOUR and not (
            too_many_from_here
        ):
            token = secrets.token_urlsafe(32)

            db.add(
                PasswordResetToken(
                    user_id=user.id,
                    token_hash=_hash_reset_token(token),
                    expires_at=now + RESET_TOKEN_TTL,
                )
            )
            db.commit()

            background.add_task(_send_reset_email, user.email, token)

    return MessageRead(
        message=(
            "If an account exists for that email, we have sent a link to "
            "reset the password."
        )
    )


@router.post(
    "/reset-password",
    response_model=MessageRead,
    dependencies=[Depends(require_trusted_origin)],
)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> MessageRead:
    get_auth_secret()

    now = datetime.now(timezone.utc)

    record = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash
            == _hash_reset_token(payload.token)
        )
    )

    expires_at = record.expires_at if record is not None else None

    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if (
        record is None
        or record.used_at is not None
        or expires_at is None
        or expires_at < now
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This reset link is invalid or has expired. Please ask "
                "for a new one."
            ),
        )

    user = db.get(User, record.user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired.",
        )

    refusal = check_password(payload.password, email=user.email)

    if refusal:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=refusal,
        )

    user.hashed_password = hash_password(payload.password)

    # Whoever was signed in with the old password (a forgotten laptop, or
    # someone who should not have had it) is signed out.
    revoke_sessions(db, user.id)

    # The link works once, and any other open links die with it.
    for open_token in db.scalars(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
    ):
        open_token.used_at = now

    db.commit()

    logger.info("Password reset completed for user_id=%s", user.id)

    user_events.record_event(
        db,
        request,
        user_events.PASSWORD_RESET_DONE,
        user_id=user.id,
        email=user.email,
    )

    return MessageRead(
        message="Your password has been changed. You can now sign in."
    )
