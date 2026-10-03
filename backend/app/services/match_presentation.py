"""
Builds the MatchRecordRead a caller actually sees, redacting *where* a
match was found for plans where PLAN_LIMITS[...].reveals_match_source
is False (see app.core.plan_limits for the reasoning).

This never hides *that* a match was found, or how strong it is --
similarity_percent, overall_signal, and the watermark fields are
always the honest technical signal (Bolum 3 of the master prompt).
Only the source identity (source_name, source_url,
candidate_page_url, candidate_image_url) is locked behind a plan.
"""

from __future__ import annotations

from app.core.plan_limits import get_plan_limits
from app.models.match_record import MatchRecord
from app.schemas.asset import MatchRecordRead
from app.services.page_kind import classify_page


def build_match_record_response(
    match_record: MatchRecord,
    *,
    plan_type: str | None,
    feedback_verdict: str | None = None,
) -> MatchRecordRead:
    unlocked = get_plan_limits(plan_type).reveals_match_source

    return MatchRecordRead(
        id=match_record.id,
        asset_id=match_record.asset_id,
        scan_job_id=match_record.scan_job_id,
        source_name=match_record.source_name if unlocked else None,
        source_url=match_record.source_url if unlocked else None,
        candidate_image_url=(
            match_record.candidate_image_url if unlocked else None
        ),
        candidate_page_url=(
            match_record.candidate_page_url if unlocked else None
        ),
        candidate_image_hash=match_record.candidate_image_hash,
        similarity_percent=match_record.similarity_percent,
        watermark_verified=match_record.watermark_verified,
        watermark_matches_reference=(
            match_record.watermark_matches_reference
        ),
        overall_signal=match_record.overall_signal,
        review_status=match_record.review_status,
        found_at=match_record.found_at,
        reviewed_at=match_record.reviewed_at,
        dismissed_at=match_record.dismissed_at,
        notes=match_record.notes,
        source_locked=not unlocked,
        page_kind=classify_page(match_record.candidate_page_url),
        feedback_verdict=feedback_verdict,
        created_at=match_record.created_at,
        updated_at=match_record.updated_at,
    )
