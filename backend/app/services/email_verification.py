"""
Confirming that an account owns its email address.

Only matters when EMAIL_VERIFICATION_REQUIRED is on: then the free welcome
credits wait until the address is confirmed. With it off, every account
counts as confirmed, so nothing changes until the sending domain works.
A Google sign-in confirms the address by itself.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from html import escape

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.email_verification import (
    EmailVerificationToken,
    VerifiedUser,
)
from app.models.user import User
from app.services.email_service import send_email

logger = logging.getLogger("tracemyassets.verification")

TOKEN_TTL = timedelta(hours=48)
MAX_SENDS_PER_HOUR = 3


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def has_verified_row(db: Session, user_id: int) -> bool:
    return db.get(VerifiedUser, user_id) is not None


def is_verified(db: Session, user_id: int) -> bool:
    """Whether the account counts as confirmed right now."""
    if not settings.email_verification_required:
        return True

    return has_verified_row(db, user_id)


def mark_verified(db: Session, user_id: int) -> None:
    """Record a confirmed address. Commits nothing."""
    if not has_verified_row(db, user_id):
        db.add(VerifiedUser(user_id=user_id))


def issue_token(db: Session, user: User) -> str | None:
    """
    A new confirmation token, or None when this account already asked for
    MAX_SENDS_PER_HOUR links in the last hour. Commits.
    """
    now = datetime.now(timezone.utc)

    recent = db.scalar(
        select(func.count(EmailVerificationToken.id)).where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.created_at > now - timedelta(hours=1),
        )
    )

    if (recent or 0) >= MAX_SENDS_PER_HOUR:
        return None

    token = secrets.token_urlsafe(32)

    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=now + TOKEN_TTL,
        )
    )
    db.commit()

    return token


def send_verification_email(to_email: str, token: str) -> None:
    link = f"{settings.frontend_url}/verify-email?token={token}"

    text = (
        "Welcome to TraceMyAssets.\n\nPlease confirm your email address "
        f"(the link works for 48 hours): {link}\n\nConfirming gives your "
        "account its free Deep scan credits. If you did not create an "
        "account, ignore this email."
    )

    html = (
        "<div style=\"font-family:Arial,Helvetica,sans-serif;"
        "max-width:520px;line-height:1.5;color:#1a1a1a\">"
        "<p>Welcome to TraceMyAssets.</p>"
        f"<p><a href=\"{escape(link, quote=True)}\">Confirm your email "
        "address</a> (the link works for 48 hours).</p>"
        "<p>Confirming gives your account its free Deep scan credits.</p>"
        "<p style=\"color:#666;font-size:13px\">If you did not create an "
        "account, ignore this email.</p></div>"
    )

    send_email(
        to=to_email,
        subject="Confirm your TraceMyAssets email address",
        html=html,
        text=text,
    )


def confirm_token(db: Session, token: str) -> User | None:
    """
    Use a confirmation link. Returns the account, or None when the link is
    unknown, used or expired. Commits.
    """
    now = datetime.now(timezone.utc)

    record = db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == hash_token(token)
        )
    )

    if record is None or record.used_at is not None:
        return None

    expires_at = record.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at < now:
        return None

    user = db.get(User, record.user_id)

    if user is None:
        return None

    record.used_at = now
    mark_verified(db, user.id)
    db.commit()

    return user
