from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.scan_job import ScanJob


def create_scan_job(
    db: Session,
    *,
    asset_id: int,
    provider: str,
) -> ScanJob:
    scan_job = ScanJob(
        asset_id=asset_id,
        provider=provider,
        status="queued",
        candidate_count=0,
        match_count=0,
        error_message=None,
    )

    db.add(scan_job)
    db.flush()
    db.refresh(scan_job)

    return scan_job


def mark_scan_job_running(
    db: Session,
    scan_job: ScanJob,
) -> ScanJob:
    scan_job.status = "running"
    scan_job.started_at = datetime.now(timezone.utc)
    scan_job.error_message = None

    db.add(scan_job)
    db.flush()
    db.refresh(scan_job)

    return scan_job


def mark_scan_job_completed(
    db: Session,
    scan_job: ScanJob,
    *,
    candidate_count: int,
    match_count: int,
) -> ScanJob:
    scan_job.status = "completed"
    scan_job.completed_at = datetime.now(timezone.utc)
    scan_job.candidate_count = candidate_count
    scan_job.match_count = match_count
    scan_job.error_message = None

    db.add(scan_job)
    db.flush()
    db.refresh(scan_job)

    return scan_job


def mark_scan_job_failed(
    db: Session,
    scan_job: ScanJob,
    *,
    error_message: str,
) -> ScanJob:
    scan_job.status = "failed"
    scan_job.completed_at = datetime.now(timezone.utc)
    scan_job.error_message = error_message[:2000]

    db.add(scan_job)
    db.flush()
    db.refresh(scan_job)

    return scan_job