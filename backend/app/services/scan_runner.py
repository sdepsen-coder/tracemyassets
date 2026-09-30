"""
Core scan-execution logic, shared by the HTTP /scan endpoint
(app.api.v1.endpoints.assets) and the background scheduler
(app.services.scheduler). Contains no FastAPI-specific code, so it can
run outside a request context (e.g. from a scheduled job with its own
plain DB session).
"""

from __future__ import annotations

import logging
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
    DiscoveredCandidate,
    VisualSearchProvider,
    fetch_candidate_bytes,
    get_configured_providers,
)
from app.services.page_check import check_candidate_page, should_show_match
from app.services.visual_verification import verify_candidate_image
from app.services.watermark import WatermarkError

logger = logging.getLogger("tracemyassets.scan_runner")


@dataclass
class ScanOutcome:
    scan_job: ScanJob
    matches: list[MatchRecord]
    provider_name: str


def _collect_candidates(
    providers: list[VisualSearchProvider],
    *,
    asset_id: int,
    asset_title: str,
    reference_path: Path,
    watermarked_path: Path | None,
) -> list[DiscoveredCandidate]:
    """
    Run every configured provider and pool their candidates.

    One provider failing at *search* time (a timeout, a rate limit, an
    API error for this particular query) must not lose the candidates
    the other providers already found -- so each provider's
    find_candidates() is isolated here, the same way the scheduler
    isolates failures per asset. A provider that fails to even
    *construct* (a missing/invalid API key) still fails fast, before
    this point -- see get_configured_providers() /
    visual_search_provider._build_provider().
    """
    candidates: list[DiscoveredCandidate] = []

    for provider in providers:
        try:
            candidates.extend(
                provider.find_candidates(
                    asset_id=asset_id,
                    asset_title=asset_title,
                    reference_original_path=reference_path,
                    reference_watermarked_path=watermarked_path,
                )
            )
        except Exception:
            logger.exception(
                "Discovery provider %r failed for asset_id=%s -- "
                "continuing with the remaining provider(s).",
                provider.name,
                asset_id,
            )

    return candidates


def run_scan_for_asset(
    db: Session,
    *,
    asset: Asset,
    user_id: int,
    preference: MonitoringPreference,
    reference_path: Path,
    watermarked_path: Path | None,
    watermark_secret: bytes,
    providers: list[VisualSearchProvider] | None = None,
) -> ScanOutcome:
    """
    Execute one scan for a single asset: run every configured
    discovery provider, pool their candidates, re-verify each through
    our own pHash/watermark/ORB pipeline, and record or touch the
    resulting match rows (see record_or_touch_match for the dedup
    rule).

    One ScanJob row covers the whole run, whatever providers are
    configured -- its `provider` column holds every provider's name,
    comma-joined (e.g. "google-vision,rainforest-amazon,etsy"). There
    is no separate "found by which marketplace" column on a match;
    each MatchRecord's own source_name says which provider actually
    found it (see each provider's own DiscoveredCandidate
    construction, e.g. "Amazon (amazon.co.uk): ..." or "Etsy: ...").

    A provider that fails at construction time (bad/missing
    credential) raises before this function is even called -- see
    get_configured_providers(). A provider that fails at *search*
    time is isolated in _collect_candidates() instead, so one flaky
    provider never discards the other providers' results for this
    same scan; only a failure in the verification/database step below
    still fails the whole scan job (see both call sites' handling of
    that).
    """
    if providers is None:
        providers = get_configured_providers()

    provider_name = ",".join(provider.name for provider in providers)

    scan_job = create_scan_job(
        db,
        asset_id=asset.id,
        provider=provider_name,
    )
    scan_job = mark_scan_job_running(db, scan_job)

    candidates = _collect_candidates(
        providers,
        asset_id=asset.id,
        asset_title=asset.title,
        reference_path=reference_path,
        watermarked_path=watermarked_path,
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

        if candidate.page_may_be_stale and candidate.candidate_page_url:
            # The image matched, but is the page it was found on still
            # there, and does it really show the image? Dead pages and
            # unrelated ones (search-result pages, catalogue backends)
            # would only be noise for the user.
            page_status = check_candidate_page(
                candidate.candidate_page_url,
                candidate.candidate_image_url,
            )

            if not should_show_match(
                candidate.candidate_page_url, page_status
            ):
                logger.info(
                    "Dropping match for asset_id=%s: page %s is %s.",
                    asset.id,
                    candidate.candidate_page_url,
                    page_status.value,
                )
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
        provider_name=provider_name,
    )
