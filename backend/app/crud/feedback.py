import json
from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.feedback import FeedbackEntry
from app.models.match_record import MatchRecord

MATCH_VERDICT_KIND = "match_verdict"

# Generous for a person, tight enough that the endpoint cannot be used to
# fill the table.
MAX_FEEDBACK_ENTRIES_PER_DAY = 20


def source_kind_for(source_name: str | None) -> str:
    """
    Coarse source category of a match, derived from its source_name
    (providers label their candidates "Amazon (...)", "Etsy: ...";
    Google Web Detection uses the page title). Stored with a verdict so
    tuning can tell marketplace results from open-web ones without
    keeping the match's address.
    """
    name = (source_name or "").strip().lower()

    if name.startswith("amazon"):
        return "amazon"

    if name.startswith("etsy"):
        return "etsy"

    return "web"


def upsert_match_verdict(
    db: Session,
    *,
    user_id: int,
    match_record: MatchRecord,
    verdict: str,
) -> FeedbackEntry:
    """
    Record (or change) this user's verdict on one match. One row per
    user and match; the snapshot fields are refreshed on every change so
    they describe the match as the user last saw it.
    """
    entry = db.scalar(
        select(FeedbackEntry).where(
            FeedbackEntry.user_id == user_id,
            FeedbackEntry.kind == MATCH_VERDICT_KIND,
            FeedbackEntry.match_id == match_record.id,
        )
    )

    if entry is None:
        entry = FeedbackEntry(
            user_id=user_id,
            kind=MATCH_VERDICT_KIND,
            match_id=match_record.id,
        )

    entry.verdict = verdict
    entry.similarity_percent = match_record.similarity_percent
    entry.overall_signal = match_record.overall_signal
    entry.source_kind = source_kind_for(match_record.source_name)

    db.add(entry)
    db.flush()
    db.refresh(entry)

    return entry


def clear_match_verdict(
    db: Session,
    *,
    user_id: int,
    match_id: int,
) -> bool:
    """Remove this user's verdict on a match. True if there was one."""
    entry = db.scalar(
        select(FeedbackEntry).where(
            FeedbackEntry.user_id == user_id,
            FeedbackEntry.kind == MATCH_VERDICT_KIND,
            FeedbackEntry.match_id == match_id,
        )
    )

    if entry is None:
        return False

    db.delete(entry)
    db.flush()

    return True


def get_verdicts_for_matches(
    db: Session,
    *,
    user_id: int,
    match_ids: Iterable[int],
) -> dict[int, str]:
    """This user's verdicts for the given matches: {match_id: verdict}."""
    ids = list(match_ids)

    if not ids:
        return {}

    rows = db.execute(
        select(FeedbackEntry.match_id, FeedbackEntry.verdict).where(
            FeedbackEntry.user_id == user_id,
            FeedbackEntry.kind == MATCH_VERDICT_KIND,
            FeedbackEntry.match_id.in_(ids),
        )
    )

    return {
        match_id: verdict
        for match_id, verdict in rows
        if match_id is not None and verdict is not None
    }


def count_feedback_since(
    db: Session,
    *,
    user_id: int,
    since: datetime,
) -> int:
    """
    How many beta_survey / general entries this user has sent since a
    moment (match verdicts are not counted -- they are bounded by the
    number of matches and changed in place).
    """
    return (
        db.scalar(
            select(func.count())
            .select_from(FeedbackEntry)
            .where(
                FeedbackEntry.user_id == user_id,
                FeedbackEntry.kind != MATCH_VERDICT_KIND,
                FeedbackEntry.created_at >= since,
            )
        )
        or 0
    )


def create_feedback(
    db: Session,
    *,
    user_id: int,
    kind: str,
    message: str | None,
    answers: dict[str, str] | None,
) -> FeedbackEntry:
    clean_message = message.strip() if message else ""

    entry = FeedbackEntry(
        user_id=user_id,
        kind=kind,
        message=clean_message or None,
        answers_json=(
            json.dumps(answers, ensure_ascii=False) if answers else None
        ),
    )

    db.add(entry)
    db.flush()
    db.refresh(entry)

    return entry
