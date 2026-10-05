import time

from sqlalchemy.orm import Session

from app.models.session_cutoff import SessionCutoff


def revoke_sessions(db: Session, user_id: int) -> None:
    """
    End every session issued up to now for this user. A session started
    after this call (a fresh sign-in) is unaffected. Commits nothing: the
    caller commits together with its own change.
    """
    now = int(time.time())
    cutoff = db.get(SessionCutoff, user_id)

    if cutoff is None:
        db.add(SessionCutoff(user_id=user_id, valid_from=now))
    else:
        cutoff.valid_from = max(cutoff.valid_from, now)


def session_is_revoked(db: Session, user_id: int, issued_at: int) -> bool:
    cutoff = db.get(SessionCutoff, user_id)

    return cutoff is not None and issued_at < cutoff.valid_from
