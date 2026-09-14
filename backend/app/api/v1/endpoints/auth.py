from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.browser_session import (
    clear_session_cookie,
    require_trusted_origin,
    set_session_cookie,
)
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    TOKEN_TTL_SECONDS,
    create_access_token,
    decode_access_token,
    get_auth_secret,
    hash_password,
    verify_password,
)
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=12, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)


class UserRead(BaseModel):
    id: int
    email: str
    plan_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
    db: Session = Depends(get_db),
) -> User:
    # Avoid creating accounts while authentication is misconfigured.
    get_auth_secret()

    email = normalize_email(str(payload.email))

    existing = db.scalar(
        select(User).where(User.email == email)
    )

    if existing is not None:
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
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account could not be created.",
        ) from exc

    db.refresh(user)
    return user


@router.post("/login", response_model=TokenRead)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenRead:
    get_auth_secret()

    email = normalize_email(str(payload.email))

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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenRead(
        access_token=create_access_token(user.id)
    )


@router.get("/me", response_model=UserRead)
def read_current_user(
    user: User = Depends(get_current_user),
) -> User:
    return user


@router.post(
    "/session",
    response_model=UserRead,
    dependencies=[Depends(require_trusted_origin)],
)
def create_browser_session(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    # Reuse the existing credential verification and token generation.
    result = login(payload=payload, db=db)

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