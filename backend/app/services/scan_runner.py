"""
Core scan-execution logic, shared by the HTTP /scan endpoint
(app.api.v1.endpoints.assets) and the background scheduler
(app.services.scheduler). Contains no FastAPI-specific code, so it can
run outside a request context (e.g. from a scheduled job with its own
plain DB session).
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, replace
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
from app.services.page_images import read_page_images
from app.services.page_check import (
    PageStatus,
    check_candidate_page,
    should_show_match,
)
from app.services.visual_verification import (
    is_geometric_copy,
    verify_candidate_image,
)
from app.services.watermark import WatermarkError

logger = logging.getLogger("tracemyassets.scan_runner")


@dataclass
class ScanDiagnostics:
    """
    Why a scan's candidates did or did not become matches.

    Only counts (plus the best similarity seen) -- never source URLs,
    because those are hidden from Free-plan users. The URLs and
    per-candidate reasons go to the server log instead.
    """

    candidates: int = 0
    no_image_address: int = 0
    image_unreachable: int = 0
    not_comparable: int = 0
    below_threshold: int = 0
    page_gone: int = 0
    page_unrelated: int = 0
    page_unreadable: int = 0
    recorded: int = 0
    best_similarity_percent: float | None = None


@dataclass
class ScanOutcome:
    scan_job: ScanJob
    matches: list[MatchRecord]
    provider_name: str
    diagnostics: ScanDiagnostics


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


# Search engines sometimes report a page that contains a matching image
# without saying which image. We read a few such pages ourselves and check
# their main images. Bounded so a scan (which runs inside an HTTP request)
# cannot be held up by slow third-party sites.
MAX_PAGES_TO_READ = 6
PAGE_READING_BUDGET_SECONDS = 45.0


def _expand_pages_without_images(
    candidates: list[DiscoveredCandidate],
    diagnostics: "ScanDiagnostics",
    *,
    asset_id: int,
) -> tuple[list[DiscoveredCandidate], set[str]]:
    """
    Replace each image-less page candidate with one candidate per main
    image found on that page. Returns the new candidate list and the set
    of page URLs that were expanded (so only the best image per page is
    recorded).
    """
    expanded: list[DiscoveredCandidate] = []
    expanded_pages: set[str] = set()
    pages_read = 0
    deadline = time.monotonic() + PAGE_READING_BUDGET_SECONDS

    for candidate in candidates:
        needs_reading = (
            candidate.candidate_image_bytes is None
            and not candidate.candidate_image_url
            and candidate.candidate_page_url
        )

        if not needs_reading:
            expanded.append(candidate)
            continue

        if pages_read >= MAX_PAGES_TO_READ or time.monotonic() > deadline:
            diagnostics.no_image_address += 1
            continue

        pages_read += 1
        failure, image_urls = read_page_images(candidate.candidate_page_url)

        if failure is not None and failure.value == "gone":
            diagnostics.page_gone += 1
            logger.info(
                "asset_id=%s page gone while looking for images: %s",
                asset_id,
                candidate.candidate_page_url,
            )
            continue

        if failure is not None or not image_urls:
            diagnostics.page_unreadable += 1
            logger.info(
                "asset_id=%s page unreadable or without usable images: %s",
                asset_id,
                candidate.candidate_page_url,
            )
            continue

        expanded_pages.add(candidate.candidate_page_url)

        for image_url in image_urls:
            # The page was just read successfully and the image comes
            # from its own HTML, so it needs no second page check.
            expanded.append(
                replace(
                    candidate,
                    candidate_image_url=image_url,
                    page_may_be_stale=False,
                )
            )

    return expanded, expanded_pages


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
    diagnostics = ScanDiagnostics(candidates=len(candidates))

    candidates, expanded_pages = _expand_pages_without_images(
        candidates, diagnostics, asset_id=asset.id
    )
    recorded_expanded_pages: set[str] = set()

    for candidate in candidates:
        if (
            candidate.candidate_page_url in expanded_pages
            and candidate.candidate_page_url in recorded_expanded_pages
        ):
            # This page already produced a match from another of its
            # images; one record per page is enough.
            continue

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
            if candidate.candidate_image_url:
                diagnostics.image_unreachable += 1
                logger.info(
                    "asset_id=%s candidate skipped: image unreachable %s",
                    asset.id,
                    candidate.candidate_image_url,
                )
            else:
                diagnostics.no_image_address += 1
                logger.info(
                    "asset_id=%s candidate skipped: no image address "
                    "(page %s)",
                    asset.id,
                    candidate.candidate_page_url,
                )
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
            diagnostics.not_comparable += 1
            logger.info(
                "asset_id=%s candidate skipped: not a comparable image %s",
                asset.id,
                candidate.candidate_image_url,
            )
            continue

        if (
            diagnostics.best_similarity_percent is None
            or result.phash_similarity_percent
            > diagnostics.best_similarity_percent
        ):
            diagnostics.best_similarity_percent = (
                result.phash_similarity_percent
            )

        # The user's threshold applies to whole-image similarity. A copy
        # that is cropped, framed or shown in a mockup scores low there
        # but is still the same artwork, so geometric evidence (see
        # visual_verification.is_geometric_copy) qualifies on its own.
        should_alert = (
            result.watermark_matches_reference
            or result.phash_similarity_percent
            >= preference.alert_threshold_percent
            or is_geometric_copy(
                result.orb.homography_inliers,
                result.orb.inlier_ratio_percent,
            )
        )

        if not should_alert:
            diagnostics.below_threshold += 1
            logger.info(
                "asset_id=%s candidate below threshold: %.0f%% < %.0f%% "
                "(orb good=%s inliers=%s ratio=%s) (%s)",
                asset.id,
                result.phash_similarity_percent,
                preference.alert_threshold_percent,
                result.orb.good_matches,
                result.orb.homography_inliers,
                result.orb.inlier_ratio_percent,
                candidate.candidate_image_url,
            )
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
                if page_status is PageStatus.GONE:
                    diagnostics.page_gone += 1
                else:
                    diagnostics.page_unrelated += 1

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
        diagnostics.recorded += 1

        if candidate.candidate_page_url in expanded_pages:
            recorded_expanded_pages.add(candidate.candidate_page_url)

    scan_job = mark_scan_job_completed(
        db,
        scan_job,
        candidate_count=diagnostics.candidates,
        match_count=len(matches),
    )

    return ScanOutcome(
        scan_job=scan_job,
        matches=matches,
        provider_name=provider_name,
        diagnostics=diagnostics,
    )
