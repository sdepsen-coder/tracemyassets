"""
"Download my data": everything the service holds about one account, as a
ZIP of readable JSON files plus the person's own artwork files.
"""

from __future__ import annotations

import json
import re
import tempfile
import zipfile
from datetime import date, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.credit_entry import CreditEntry
from app.models.feedback import FeedbackEntry
from app.models.match_record import MatchRecord
from app.models.monitoring import MonitoringPreference
from app.models.scan_job import ScanJob
from app.models.user import User
from app.models.user_event import UserEvent
from app.services.asset_paths import original_file_path
from app.services.email_verification import is_verified

# Never exported: secrets and internal values.
HIDDEN_COLUMNS = {"hashed_password", "watermark_payload"}

README = """TraceMyAssets: your data

This ZIP holds the data we keep about your account.

account.json     your account
artworks.json    your artworks and their monitoring settings
scans.json       scan history
matches.json     possible matches found for your artworks
credits.json     your credit entries
feedback.json    verdicts and messages you sent us
activity.json    the security and activity log (kept for 90 days)
files/           your original files and protected copies

Passwords are never stored in readable form and are not included.
"""


def _plain(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    return value


def row_to_dict(row: Any) -> dict[str, Any]:
    columns = inspect(row).mapper.column_attrs

    return {
        column.key: _plain(getattr(row, column.key))
        for column in columns
        if column.key not in HIDDEN_COLUMNS
    }


def _write_json(archive: zipfile.ZipFile, name: str, data: Any) -> None:
    archive.writestr(
        name,
        json.dumps(data, indent=2, ensure_ascii=False),
    )


def _safe_name(title: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", title).strip("-.")

    return cleaned[:60] or "artwork"


def build_export(db: Session, user: User) -> Path:
    """
    Write the ZIP to a temporary file and return its path. The caller
    sends it and then deletes it.
    """
    assets = list(
        db.scalars(
            select(Asset).where(Asset.user_id == user.id).order_by(Asset.id)
        )
    )
    asset_ids = [asset.id for asset in assets]

    def rows(model: Any, *conditions: Any, order: Any = None) -> list[Any]:
        statement = select(model).where(*conditions)

        if order is not None:
            statement = statement.order_by(order)

        return list(db.scalars(statement))

    preferences = (
        {
            pref.asset_id: row_to_dict(pref)
            for pref in rows(
                MonitoringPreference, MonitoringPreference.asset_id.in_(asset_ids)
            )
        }
        if asset_ids
        else {}
    )

    account = row_to_dict(user)
    account["email_verified"] = is_verified(db, user.id)

    handle = tempfile.NamedTemporaryFile(
        prefix="tma-export-", suffix=".zip", delete=False
    )
    handle.close()
    path = Path(handle.name)

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("README.txt", README)
        _write_json(archive, "account.json", account)

        artworks = []

        for asset in assets:
            item = row_to_dict(asset)
            item["monitoring"] = preferences.get(asset.id)
            artworks.append(item)

        _write_json(archive, "artworks.json", artworks)

        if asset_ids:
            scans = rows(ScanJob, ScanJob.asset_id.in_(asset_ids), order=ScanJob.id)
            matches = rows(
                MatchRecord, MatchRecord.asset_id.in_(asset_ids), order=MatchRecord.id
            )
        else:
            scans, matches = [], []

        _write_json(archive, "scans.json", [row_to_dict(r) for r in scans])
        _write_json(archive, "matches.json", [row_to_dict(r) for r in matches])
        _write_json(
            archive,
            "credits.json",
            [
                row_to_dict(r)
                for r in rows(
                    CreditEntry,
                    CreditEntry.user_id == user.id,
                    order=CreditEntry.id,
                )
            ],
        )
        _write_json(
            archive,
            "feedback.json",
            [
                row_to_dict(r)
                for r in rows(
                    FeedbackEntry,
                    FeedbackEntry.user_id == user.id,
                    order=FeedbackEntry.id,
                )
            ],
        )
        _write_json(
            archive,
            "activity.json",
            [
                row_to_dict(r)
                for r in rows(
                    UserEvent,
                    UserEvent.user_id == user.id,
                    order=UserEvent.id,
                )
            ],
        )

        for asset in assets:
            stem = f"{asset.id}-{_safe_name(asset.title)}"

            try:
                original = original_file_path(asset)
            except HTTPException:
                continue  # the file is gone; the row is still listed above

            archive.write(
                original,
                f"files/originals/{stem}{original.suffix}",
            )

            protected = original.parent / "watermarked.png"

            if asset.watermarked_url and protected.is_file():
                archive.write(protected, f"files/protected-copies/{stem}.png")

    return path
