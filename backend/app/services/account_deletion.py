"""
Deleting an account, and keeping a deleted mailbox from being used to
collect the welcome credits again.

Schema comes from create_all (no ON DELETE CASCADE), so every table that
points at the user is cleaned explicitly, in an order that keeps the
foreign keys happy.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.core.security import get_auth_secret
from app.crud.asset import delete_asset
from app.models.asset import Asset
from app.models.credit_entry import CreditEntry
from app.models.deleted_signup import DeletedSignup
from app.models.email_verification import (
    EmailVerificationToken,
    VerifiedUser,
)
from app.models.feedback import FeedbackEntry
from app.models.match import Match
from app.models.password_reset import PasswordResetToken
from app.models.session_cutoff import SessionCutoff
from app.models.signup_key import SignupKey
from app.models.takedown import Takedown
from app.models.user import User
from app.models.user_event import UserEvent
from app.models.user_suspension import UserSuspension
from app.services.asset_paths import asset_storage_directory
from app.services.email_identity import canonical_email

logger = logging.getLogger("tracemyassets.account")

# How long the mailbox fingerprint is kept.
FINGERPRINT_DAYS = 365

RETURNING_NOTE = "No welcome credits: this mailbox had an account before"


def mailbox_fingerprint(mailbox: str) -> str:
    """Keyed hash, so it cannot be reversed or guessed without the server secret."""
    secret = get_auth_secret()
    key = secret.encode() if isinstance(secret, str) else secret

    return hmac.new(
        key,
        f"deleted-mailbox:{mailbox}".encode(),
        hashlib.sha256,
    ).hexdigest()


def was_deleted_before(db: Session, mailbox: str) -> bool:
    return db.get(DeletedSignup, mailbox_fingerprint(mailbox)) is not None


def withhold_welcome_if_returning(
    db: Session,
    user_id: int,
    mailbox: str,
) -> None:
    """
    For a mailbox whose account was deleted before: record a welcome entry
    worth zero, so the one-time welcome grant is treated as already used.
    Call inside the sign-up transaction, before it commits.
    """
    from app.services.credits import WELCOME_GRANT_KEY

    if not was_deleted_before(db, mailbox):
        return

    db.add(
        CreditEntry(
            user_id=user_id,
            delta=0,
            reason="welcome",
            grant_key=WELCOME_GRANT_KEY,
            note=RETURNING_NOTE,
        )
    )


def delete_account(db: Session, user: User) -> list[Path]:
    """
    Remove the account and everything that belongs to it, and commit.
    Returns the artwork folders to delete from disk (the caller does that
    after the commit, so a file problem never leaves half an account).
    """
    user_id = user.id
    email = user.email
    mailbox = canonical_email(email)

    assets = list(db.scalars(select(Asset).where(Asset.user_id == user_id)))
    asset_ids = [asset.id for asset in assets]

    folders: list[Path] = []

    for asset in assets:
        try:
            folders.append(asset_storage_directory(asset))
        except HTTPException:
            logger.warning("Asset %s has no valid storage folder.", asset.id)

    # Old, unused tables that still reference users and artworks.
    db.execute(delete(Takedown).where(Takedown.user_id == user_id))

    if asset_ids:
        db.execute(delete(Match).where(Match.asset_id.in_(asset_ids)))

    for asset in assets:
        delete_asset(db, asset=asset)

    db.execute(delete(CreditEntry).where(CreditEntry.user_id == user_id))
    db.execute(delete(FeedbackEntry).where(FeedbackEntry.user_id == user_id))
    db.execute(
        delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
    )
    db.execute(
        delete(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user_id
        )
    )
    db.execute(delete(VerifiedUser).where(VerifiedUser.user_id == user_id))
    db.execute(delete(SessionCutoff).where(SessionCutoff.user_id == user_id))
    db.execute(delete(UserSuspension).where(UserSuspension.user_id == user_id))
    db.execute(delete(SignupKey).where(SignupKey.user_id == user_id))

    # The security log stays until its own 90 days are up, but no longer
    # points at a person.
    db.execute(
        update(UserEvent)
        .where((UserEvent.user_id == user_id) | (UserEvent.email == email))
        .values(user_id=None, email=None)
    )

    fingerprint = mailbox_fingerprint(mailbox)

    if db.get(DeletedSignup, fingerprint) is None:
        db.add(DeletedSignup(key_hash=fingerprint))

    db.delete(user)
    db.commit()

    return folders


def remove_folders(folders: list[Path]) -> None:
    """Best-effort: the database is already the source of truth."""
    for folder in folders:
        shutil.rmtree(folder, ignore_errors=True)


def purge_old_fingerprints(db: Session, *, now: datetime | None = None) -> int:
    current = now or datetime.now(timezone.utc)
    cutoff = current - timedelta(days=FINGERPRINT_DAYS)

    result = db.execute(
        delete(DeletedSignup)
        .where(DeletedSignup.created_at < cutoff)
        .execution_options(synchronize_session=False)
    )
    db.commit()

    return int(result.rowcount or 0)
