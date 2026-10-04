import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import dotenv_values
from fastapi import HTTPException, status
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError


ALGORITHM = "HS256"
# A signed-in browser stays signed in for 30 days of use: the session is
# renewed (see RENEW_AFTER_SECONDS) whenever the app checks it, so only a
# month of not opening the app signs you out.
TOKEN_TTL_SECONDS = 30 * 24 * 3600
RENEW_AFTER_SECONDS = 24 * 3600
TOKEN_ISSUER = "tracemyassets-api"
TOKEN_AUDIENCE = "tracemyassets-client"

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

password_hasher = PasswordHash.recommended()

# Used when the requested account does not exist.
DUMMY_PASSWORD_HASH = password_hasher.hash(
    "not-a-real-account-password"
)


def get_auth_secret() -> str:
    secret = (
        os.environ.get("AUTH_SECRET_KEY")
        or dotenv_values(ENV_PATH).get("AUTH_SECRET_KEY")
    )

    if not isinstance(secret, str) or len(secret) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        )

    return secret


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return password_hasher.verify(password, hashed_password)
    except (UnknownHashError, ValueError):
        return False


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)

    return jwt.encode(
        {
            "sub": str(user_id),
            "iat": now,
            "exp": now + timedelta(seconds=TOKEN_TTL_SECONDS),
            "iss": TOKEN_ISSUER,
            "aud": TOKEN_AUDIENCE,
        },
        get_auth_secret(),
        algorithm=ALGORITHM,
    )


def token_age_seconds(token: str) -> float | None:
    """Seconds since a (valid) token was issued, or None if unreadable."""
    try:
        payload = jwt.decode(
            token,
            get_auth_secret(),
            algorithms=[ALGORITHM],
            issuer=TOKEN_ISSUER,
            audience=TOKEN_AUDIENCE,
        )

        return datetime.now(timezone.utc).timestamp() - float(payload["iat"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        return None


def decode_access_token(token: str) -> int:
    try:
        payload = jwt.decode(
            token,
            get_auth_secret(),
            algorithms=[ALGORITHM],
            issuer=TOKEN_ISSUER,
            audience=TOKEN_AUDIENCE,
            options={
                "require": ["sub", "iat", "exp", "iss", "aud"],
            },
        )

        user_id = int(payload["sub"])
        if user_id <= 0:
            raise ValueError("Invalid subject.")

        return user_id

    except (jwt.InvalidTokenError, ValueError, TypeError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc