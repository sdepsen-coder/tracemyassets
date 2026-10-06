"""
Lightweight periodic scanning.

Deliberately a single in-process APScheduler job, not Celery/Redis/
Docker -- the master prompt's own roadmap says not to add that
infrastructure before it's needed. This is enough to validate the
monitoring-first flow end-to-end with real users; move to a real task
queue only once scan volume actually requires it.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.asset import Asset
from app.models.monitoring import MonitoringPreference
from app.models.scan_job import ScanJob
from app.models.user import User
from app.services.alert_emails import send_new_match_alert
from app.services.asset_paths import load_watermark_secret, original_file_path
from app.services.scan_quota import is_dormant
from app.services.scan_runner import run_scan_for_asset

logger = logging.getLogger("tracemyassets.scheduler")

FREQUENCY_INTERVALS = {
    "daily": timedelta(days=1),
    "weekly": timedelta(days=7),
    "monthly": timedelta(days=30),
}
DEFAULT_INTERVAL = FREQUENCY_INTERVALS["weekly"]


def last_completed_scan_at(
    db: Session,
    asset_id: int,
) -> datetime | None:
    statement = (
        select(ScanJob.completed_at)
        .where(
            ScanJob.asset_id == asset_id,
            ScanJob.status == "completed",
        )
        .order_by(ScanJob.completed_at.desc())
        .limit(1)
    )

    return db.scalar(statement)


def is_due(
    preference: MonitoringPreference,
    last_scan_at: datetime | None,
    *,
    now: datetime | None = None,
) -> bool:
    """
    Whether an asset with this monitoring preference should be
    (re-)scanned now. A preference with no prior completed scan is
    always due (first scan). Unknown scan_frequency values fall back
    to the weekly interval rather than erroring.
    """
    if not preference.enabled:
        return False

    if last_scan_at is None:
        return True

    interval = FREQUENCY_INTERVALS.get(
        preference.scan_frequency, DEFAULT_INTERVAL
    )

    if last_scan_at.tzinfo is None:
        last_scan_at = last_scan_at.replace(tzinfo=timezone.utc)

    reference_now = now or datetime.now(timezone.utc)

    return reference_now - last_scan_at >= interval


def run_due_scans(db: Session | None = None) -> None:
    """
    One scheduler tick: find every enabled, due asset and scan it.

    Accepts an optional session so tests can run this against an
    isolated database; the real scheduler always calls it with no
    argument, which opens (and closes) its own session -- this is not
    a request handler, so there is no request-scoped session to reuse.

    Isolates failures per asset -- one broken asset (missing file,
    provider error, etc.) must never stop the rest of the batch.
    """
    owns_session = db is None
    db = db or SessionLocal()

    try:
        preferences = list(
            db.scalars(
                select(MonitoringPreference).where(
                    MonitoringPreference.enabled.is_(True)
                )
            )
        )

        due_count = 0
        dormant_count = 0

        for preference in preferences:
            asset = db.get(Asset, preference.asset_id)

            if asset is None or asset.status != "active":
                continue

            owner = db.get(User, asset.user_id)

            # A Free account nobody has opened for a long time is not
            # scanned (each scan costs money). It resumes by itself the
            # moment the person is active again.
            if owner is not None and is_dormant(db, owner):
                dormant_count += 1
                continue

            last_scan_at = last_completed_scan_at(db, asset.id)

            if not is_due(preference, last_scan_at):
                continue

            due_count += 1

            try:
                reference_path = original_file_path(asset)
                watermarked_path = (
                    reference_path.parent / "watermarked.png"
                    if asset.watermarked_url
                    else None
                )

                outcome = run_scan_for_asset(
                    db,
                    asset=asset,
                    user_id=asset.user_id,
                    preference=preference,
                    reference_path=reference_path,
                    watermarked_path=watermarked_path,
                    watermark_secret=load_watermark_secret(),
                )
                db.commit()
            except Exception:
                db.rollback()
                logger.exception(
                    "Scheduled scan failed for asset_id=%s", asset.id
                )
                continue

            # Only scheduled scans email: someone who ran a scan by hand
            # is already looking at the result. Sent after the commit and
            # isolated, so an email problem never affects the scan.
            if outcome.new_match_count > 0:
                try:
                    user = db.get(User, asset.user_id)

                    if user is not None:
                        send_new_match_alert(
                            to_email=user.email,
                            asset_title=asset.title,
                            new_match_count=outcome.new_match_count,
                        )
                except Exception:
                    logger.exception(
                        "Alert email failed for asset_id=%s", asset.id
                    )

        logger.info(
            "Scheduler tick: %s of %s enabled asset(s) were due "
            "(%s skipped: inactive Free account).",
            due_count,
            len(preferences),
            dormant_count,
        )
    finally:
        if owns_session:
            db.close()


def purge_old_events_job() -> None:
    """Daily clean-up: the activity log keeps IP addresses, so it is short-lived."""
    from app.services.user_events import purge_old_events

    db = SessionLocal()

    try:
        from app.services.account_deletion import purge_old_fingerprints

        removed = purge_old_events(db)
        logger.info("Activity log clean-up removed %s old event(s).", removed)
        purge_old_fingerprints(db)
    except Exception:
        db.rollback()
        logger.exception("Activity log clean-up failed.")
    finally:
        db.close()


_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
    """
    Start the background scheduler, unless SCAN_SCHEDULER_ENABLED=false
    or it is already running. Safe to call multiple times.
    """
    global _scheduler

    if not settings.scan_scheduler_enabled:
        logger.info(
            "Scan scheduler disabled (SCAN_SCHEDULER_ENABLED=false)."
        )
        return

    if _scheduler is not None:
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_due_scans,
        "interval",
        minutes=settings.scan_scheduler_interval_minutes,
        id="run_due_scans",
        next_run_time=datetime.now(timezone.utc),  # also run once at startup
    )
    _scheduler.add_job(
        purge_old_events_job,
        "interval",
        hours=24,
        id="purge_old_events",
        next_run_time=datetime.now(timezone.utc) + timedelta(minutes=5),
    )
    _scheduler.start()

    logger.info(
        "Scan scheduler started (checking every %s minute(s)).",
        settings.scan_scheduler_interval_minutes,
    )


def stop_scheduler() -> None:
    global _scheduler

    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
