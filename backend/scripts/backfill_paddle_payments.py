"""
One-off admin script: copy past Paddle payments and refunds into the
paddle_transactions / paddle_adjustments tables, so the admin pages also
show what was paid before those tables existed.

It only records. It never adds or takes credits and never changes a plan:
the webhooks already did that when the payments happened. Running it
twice is safe (a payment already recorded is skipped).

Before running:
  * deploy the version that has the new tables (the app creates them on
    start-up);
  * take a pg_dump (see CLAUDE.md: no automatic backups yet).

Run it where both PADDLE_API_KEY and DATABASE_URL are set, which is the
backend service on Railway (project imaginative-wisdom):

    railway ssh                      # into the backend service
    python scripts/backfill_paddle_payments.py            # dry run
    python scripts/backfill_paddle_payments.py --apply    # write

The dry run reads everything and prints what it would record, then
rolls back. PADDLE_ENVIRONMENT decides sandbox or live, as for the app.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Callable, Iterator
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from sqlalchemy import inspect
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.paddle import PaddleTransaction
from app.services import paddle_billing

Fetch = Callable[[str, dict[str, str] | None], dict[str, Any]]


def paddle_get(url: str, params: dict[str, str] | None) -> dict[str, Any]:
    response = httpx.get(
        url,
        params=params,
        headers={"Authorization": f"Bearer {settings.paddle_api_key}"},
        timeout=30.0,
    )
    response.raise_for_status()

    return response.json()


def listed(
    fetch: Fetch, path: str, params: dict[str, str] | None = None
) -> Iterator[dict[str, Any]]:
    """Every entity of a Paddle list endpoint, following its pages."""
    url: str | None = f"{paddle_billing.api_base()}{path}"

    while url:
        page = fetch(url, params)
        params = None  # the "next" link already carries them

        yield from page.get("data") or []

        pagination = (page.get("meta") or {}).get("pagination") or {}
        url = pagination.get("next") if pagination.get("has_more") else None


def backfill(db: Session, fetch: Fetch) -> dict[str, int]:
    """Record every completed transaction and every adjustment. No commit."""
    counts = {"payments": 0, "payments_skipped": 0, "unmatched": 0,
              "adjustments": 0}

    for transaction in listed(fetch, "/transactions", {"status": "completed"}):
        note = paddle_billing.record_transaction(db, transaction)

        if note.startswith("recorded"):
            counts["payments"] += 1
            row = db.get(PaddleTransaction, str(transaction["id"]))

            if row is not None and row.user_id is None:
                counts["unmatched"] += 1
                print(f"  no account for {transaction['id']}")
        else:
            counts["payments_skipped"] += 1

    db.flush()

    for adjustment in listed(fetch, "/adjustments"):
        if paddle_billing.record_adjustment(db, adjustment).startswith(
            "recorded"
        ):
            counts["adjustments"] += 1

    db.flush()

    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "--apply", action="store_true", help="write (default: dry run)"
    )
    args = parser.parse_args()

    if not settings.paddle_api_key:
        print("PADDLE_API_KEY is not set.")
        raise SystemExit(1)

    from app.db.session import SessionLocal, engine

    tables = set(inspect(engine).get_table_names())

    if not {"paddle_transactions", "paddle_adjustments"} <= tables:
        print("The payment tables do not exist yet: deploy the new version first.")
        raise SystemExit(1)

    print(
        f"Paddle {settings.paddle_environment} ({paddle_billing.api_base()}), "
        f"{'APPLY' if args.apply else 'dry run'}"
    )

    db = SessionLocal()

    try:
        counts = backfill(db, paddle_get)

        print(
            f"{counts['payments']} payment(s) to record "
            f"({counts['unmatched']} without a matching account), "
            f"{counts['payments_skipped']} already there, "
            f"{counts['adjustments']} refund/chargeback record(s)."
        )

        if args.apply:
            db.commit()
            print("Saved.")
        else:
            db.rollback()
            print("Dry run: nothing saved. Add --apply to write.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
