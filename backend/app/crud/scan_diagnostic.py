from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.scan_diagnostic import ScanDiagnostic
from app.models.scan_job import ScanJob


def record_scan_diagnostics(
    db: Session,
    *,
    scan_job_id: int,
    candidates: int,
    no_image_address: int,
    image_unreachable: int,
    not_comparable: int,
    below_threshold: int,
    page_gone: int,
    page_unrelated: int,
    page_unreadable: int,
    recorded: int,
    best_similarity_percent: float | None,
    providers_asked: int,
    provider_failures: int,
) -> ScanDiagnostic:
    """Keep the counts of one finished scan. Does not commit."""
    row = db.scalar(
        select(ScanDiagnostic).where(ScanDiagnostic.scan_job_id == scan_job_id)
    )

    if row is None:
        row = ScanDiagnostic(scan_job_id=scan_job_id)

    row.candidates = candidates
    row.no_image_address = no_image_address
    row.image_unreachable = image_unreachable
    row.not_comparable = not_comparable
    row.below_threshold = below_threshold
    row.page_gone = page_gone
    row.page_unrelated = page_unrelated
    row.page_unreadable = page_unreadable
    row.recorded = recorded
    row.best_similarity_percent = best_similarity_percent
    row.providers_asked = providers_asked
    row.provider_failures = provider_failures

    db.add(row)
    db.flush()

    return row


def delete_scan_diagnostics_for_asset(
    db: Session,
    *,
    asset_id: int,
) -> None:
    """
    Delete the diagnostics of every scan of one asset. Called before
    delete_scan_jobs_for_asset(), since scan_diagnostics.scan_job_id
    references that table (and create_all() adds no ON DELETE CASCADE).
    """
    job_ids = select(ScanJob.id).where(ScanJob.asset_id == asset_id)

    db.execute(
        delete(ScanDiagnostic).where(ScanDiagnostic.scan_job_id.in_(job_ids))
    )
