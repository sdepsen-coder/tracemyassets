from sqlalchemy.orm import Session

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