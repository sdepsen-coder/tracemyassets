"""
Remember which link a new account came from, so we can tell which of our
own outreach (a reply, a post, a guide) brought real sign-ups.

Only a short tag is stored, never anything about the person. The tag comes
from the visitor's own address bar, so it is untrusted input: anything that
is not a plain short tag is ignored instead of stored.
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.models.signup_attribution import SignupAttribution

MAX_REF_LENGTH = 80

# Letters, digits and . _ : - only (for example "hearked-bluesky").
_REF_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._:-]*$")


def clean_ref(value: str | None) -> str | None:
    """The tag in lower case, or None when it is empty or not a plain tag."""
    if not isinstance(value, str):
        return None

    ref = value.strip().lower()

    if not ref or len(ref) > MAX_REF_LENGTH:
        return None

    return ref if _REF_PATTERN.fullmatch(ref) else None


def record_signup_ref(db: Session, user_id: int, ref: str | None) -> None:
    """
    Add the tag to the current transaction (the caller commits). Does
    nothing without a usable tag, and never replaces an earlier one.
    """
    cleaned = clean_ref(ref)

    if cleaned is None:
        return

    if db.get(SignupAttribution, user_id) is not None:
        return

    db.add(SignupAttribution(user_id=user_id, ref=cleaned))
