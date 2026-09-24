from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.match_record import MatchRecord


def create_match_record(
    db: Session,
    *,
    asset_id: int,
    scan_job_id: int | None,
    source_name: str,
    source_url: str | None,
    candidate_image_url: str | None,
    candidate_page_url: str | None,
    candidate_image_hash: str | None,
    similarity_percent: float,
    watermark_verified: bool,
    watermark_matches_reference: bool,
    overall_signal: str,
    review_status: str = "new",
) -> MatchRecord:
    match_record = MatchRecord(
        asset_id=asset_id,
        scan_job_id=scan_job_id,
        source_name=source_name,
        source_url=source_url,
        candidate_image_url=candidate_image_url,
        candidate_page_url=candidate_page_url,
        candidate_image_hash=candidate_image_hash,
        similarity_percent=similarity_percent,
        watermark_verified=watermark_verified,
        watermark_matches_reference=watermark_matches_reference,
        overall_signal=overall_signal,
        review_status=review_status,
    )

    db.add(match_record)
    db.flush()
    db.refresh(match_record)

    return match_record


def list_match_records(
    db: Session,
    *,
    user_id: int,
    review_status: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[MatchRecord]:
    statement = (
        select(MatchRecord)
        .join(Asset, Asset.id == MatchRecord.asset_id)
        .where(Asset.user_id == user_id)
        .order_by(
            MatchRecord.found_at.desc(),
            MatchRecord.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    if review_status is not None:
        statement = statement.where(
            MatchRecord.review_status == review_status,
        )

    return list(db.scalars(statement).all())


def get_match_record_for_user(
    db: Session,
    *,
    match_id: int,
    user_id: int,
) -> MatchRecord | None:
    statement = (
        select(MatchRecord)
        .join(Asset, Asset.id == MatchRecord.asset_id)
        .where(
            MatchRecord.id == match_id,
            Asset.user_id == user_id,
        )
    )

    return db.scalar(statement)


def update_match_record(
    db: Session,
    *,
    match_record: MatchRecord,
    review_status: str,
    notes: str | None,
    update_notes: bool,
) -> MatchRecord:
    now = datetime.now(timezone.utc)
    match_record.review_status = review_status

    if review_status == "dismissed":
        match_record.reviewed_at = now
        match_record.dismissed_at = now
    else:
        if review_status in {"reviewing", "confirmed", "archived"}:
            if match_record.reviewed_at is None or review_status == "confirmed":
                match_record.reviewed_at = now
        match_record.dismissed_at = None

    if update_notes:
        clean_notes = notes.strip() if notes else ""
        match_record.notes = clean_notes or None

    db.add(match_record)
    db.flush()
    db.refresh(match_record)

    return match_record