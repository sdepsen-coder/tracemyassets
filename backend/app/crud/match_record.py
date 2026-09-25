from datetime import datetime, timezone

from sqlalchemy import func, select
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


def find_existing_match_for_dedup(
    db: Session,
    *,
    asset_id: int,
    candidate_page_url: str | None,
    candidate_image_hash: str | None,
) -> MatchRecord | None:
    """
    Look up a prior match for the same asset, the same page, and the
    same perceptual hash. Keyed on the page (not just the image hash)
    so the *same* image found on two *different* sites still produces
    two separate match records -- only a genuine re-discovery (next
    scan finding the same image on the same page again) is treated as
    a duplicate.

    Deliberately returns None (never dedupes) when either value is
    missing, since a None key would otherwise match every other row
    with a None in that column.
    """
    if not candidate_page_url or not candidate_image_hash:
        return None

    statement = select(MatchRecord).where(
        MatchRecord.asset_id == asset_id,
        MatchRecord.candidate_page_url == candidate_page_url,
        MatchRecord.candidate_image_hash == candidate_image_hash,
    )

    return db.scalar(statement)


def record_or_touch_match(
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
) -> MatchRecord:
    """
    Create a new match, or -- if this exact asset/page/hash combination
    was already recorded by an earlier scan -- refresh its analysis
    fields and scan_job_id instead of inserting a duplicate row.

    The user's own review_status (new/reviewing/confirmed/dismissed/
    archived) is never touched here: a later scan re-finding something
    the user already dismissed should not silently un-dismiss it.
    """
    existing = find_existing_match_for_dedup(
        db,
        asset_id=asset_id,
        candidate_page_url=candidate_page_url,
        candidate_image_hash=candidate_image_hash,
    )

    if existing is not None:
        existing.scan_job_id = scan_job_id
        existing.similarity_percent = similarity_percent
        existing.watermark_verified = watermark_verified
        existing.watermark_matches_reference = watermark_matches_reference
        existing.overall_signal = overall_signal

        db.add(existing)
        db.flush()
        db.refresh(existing)

        return existing

    return create_match_record(
        db,
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
        review_status="new",
    )


def count_match_records_by_status(
    db: Session,
    *,
    user_id: int,
) -> dict[str, int]:
    """
    How many of this user's matches sit in each review_status --
    powers a lightweight dashboard summary (e.g. "3 new matches to
    review") without fetching full match rows.
    """
    statement = (
        select(MatchRecord.review_status, func.count())
        .join(Asset, Asset.id == MatchRecord.asset_id)
        .where(Asset.user_id == user_id)
        .group_by(MatchRecord.review_status)
    )

    return {status: count for status, count in db.execute(statement)}


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