"""
Core scan-execution logic, shared by the HTTP /scan endpoint
(app.api.v1.endpoints.assets) and the background scheduler
(app.services.scheduler). Contains no FastAPI-specific code, so it can
run outside a request context (e.g. from a scheduled job with its own
plain DB session).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.crud.match_record import record_or_touch_match
from app.crud.scan_job import (
    create_scan_job,
    mark_scan_job_completed,
    mark_scan_job_running,
)
from app.models.asset import Asset
from app.models.match_record import MatchRecord
from app.models.monitoring import MonitoringPreference
from app.models.scan_job import ScanJob
from app.services.asset_ingestion import UploadValidationError
from app.services.visual_search_provider import (
    VisualSearchProvider,
    fetch_candidate_bytes,
    get_configured_provider,
)
from app.services.visual_verification import verify_candidate_image
from app.services.watermark import WatermarkError


@dataclass
class ScanOutcome:
    scan_job: ScanJob
    matches: list[MatchRecord]
    provider_name: str


def run_scan_for_asset(
    db: Session,
    *,
    asset: Asset,
    user_id: int,
    preference: MonitoringPreference,
    reference_path: Path,
    watermarked_path: Path | None,
    watermark_secret: bytes,
    provider: VisualSearchProvider | None = None,
) -> ScanOutcome:
    """
    Execute one scan for a single asset: discover candidates, re-verify
    each through our own pHash/watermark/ORB pipeline, and record or
    touch the resulting match rows (see record_or_touch_match for the
    dedup rule).

    Raises whatever the provider or verification pipeline raises on a
    genuine failure (e.g. the provider itself is unreachable or
    misconfigured); it does NOT try/except around that, because the
    HTTP endpoint and the scheduler each want to react differently
    (one returns a 5xx to the caller, the other logs and moves on to
    the next asset) -- see both call sites for how each wraps this.
    """
    if provider is None:
        provider = get_configured_provider()

    scan_job = create_scan_job(
        db,
        asset_id=asset.id,
        provider=provider.name,
    )
    scan_job = mark_scan_job_running(db, scan_job)

    candidates = provider.find_candidates(
        asset_id=asset.id,
        asset_title=asset.title,
        reference_original_path=reference_path,
        reference_watermarked_path=watermarked_path,
    )

    matches: list[MatchRecord] = []

    for candidate in candidates:
        candidate_bytes = candidate.candidate_image_bytes

        if candidate_bytes is None and candidate.candidate_image_url:
            # Real-provider path: the candidate only carries a URL, so
            # fetch the bytes ourselves before analysis.
            candidate_bytes = fetch_candidate_bytes(
                candidate.candidate_image_url
            )

        if candidate_bytes is None:
            # Could not retrieve this one candidate -- skip it rather
            # than failing the whole scan job.
            continue

        try:
            result = verify_candidate_image(
                reference_path=reference_path,
                reference_phash=asset.phash_value,
                expected_asset_id=asset.id,
                expected_user_id=user_id,
                candidate_content=candidate_bytes,
                watermark_secret=watermark_secret,
            )
        except (UploadValidationError, WatermarkError):
            # Not a decodable/comparable image -- skip, don't fail the
            # scan job over one bad candidate.
            continue

        should_alert = (
            result.watermark_matches_reference
            or result.phash_similarity_percent
            >= preference.alert_threshold_percent
        )

        if not should_alert:
            continue

        match_record = record_or_touch_match(
            db,
            asset_id=asset.id,
            scan_job_id=scan_job.id,
            source_name=candidate.source_name,
            source_url=candidate.source_url,
            candidate_image_url=candidate.candidate_image_url,
            candidate_page_url=candidate.candidate_page_url,
            candidate_image_hash=result.candidate_phash,
            similarity_percent=result.phash_similarity_percent,
            watermark_verified=result.watermark_payload is not None,
            watermark_matches_reference=(
                result.watermark_matches_reference
            ),
            overall_signal=result.overall_signal,
        )

        matches.append(match_record)

    scan_job = mark_scan_job_completed(
        db,
        scan_job,
        candidate_count=len(candidates),
        match_count=len(matches),
    )

    return ScanOutcome(
        scan_job=scan_job,
        matches=matches,
        provider_name=provider.name,
    )
