"""
Credits: what a deep scan costs and how the balance is kept.

A deep scan is the one thing that costs us real money per use, so it is
paid for with credits. The rules, kept deliberately simple:

  * Every account starts with WELCOME_CREDITS (given once, the first time
    the balance is looked at).
  * Starting a deep scan takes DEEP_SCAN_COST credit(s) first, and the
    charge is committed before the search runs, so a crash can never give
    a free scan.
  * If no search could be made at all (the provider was down, or our own
    spending limit was reached), the credit is given back.
  * Credits are added by hand for now (scripts/grant_credits.py); there is
    no payment flow yet.

The balance is the sum of an append-only ledger (models.credit_entry).
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.credit_entry import CreditEntry
from app.models.user import User

WELCOME_CREDITS = 3
WELCOME_GRANT_KEY = "welcome"
DEEP_SCAN_COST = 1


class InsufficientCredits(Exception):
    """Raised when a charge would take the balance below zero."""

    def __init__(self, balance: int, needed: int) -> None:
        self.balance = balance
        self.needed = needed

        super().__init__(
            f"{needed} credit(s) needed, {balance} available."
        )


def get_balance(db: Session, user_id: int) -> int:
    return int(
        db.scalar(
            select(func.coalesce(func.sum(CreditEntry.delta), 0)).where(
                CreditEntry.user_id == user_id
            )
        )
        or 0
    )


def ensure_welcome_grant(db: Session, user_id: int) -> None:
    """
    Give the one-time welcome credits if this account has not had them.
    Safe to call any number of times, from any number of requests at
    once: the unique (user_id, grant_key) pair lets exactly one succeed.
    """
    already = db.scalar(
        select(CreditEntry.id).where(
            CreditEntry.user_id == user_id,
            CreditEntry.grant_key == WELCOME_GRANT_KEY,
        )
    )

    if already is not None:
        return

    try:
        with db.begin_nested():
            db.add(
                CreditEntry(
                    user_id=user_id,
                    delta=WELCOME_CREDITS,
                    reason="welcome",
                    grant_key=WELCOME_GRANT_KEY,
                    note="Beta welcome credits",
                )
            )
    except IntegrityError:
        # Another request gave them first -- exactly what we want.
        pass


def get_credit_summary(db: Session, user_id: int) -> int:
    """The balance, after making sure the welcome credits were given."""
    ensure_welcome_grant(db, user_id)
    db.commit()

    return get_balance(db, user_id)


def charge_for_deep_scan(
    db: Session,
    *,
    user_id: int,
    asset_id: int,
    cost: int = DEEP_SCAN_COST,
) -> CreditEntry:
    """
    Take `cost` credits, or raise InsufficientCredits without taking
    anything. Commits on its own (see the module note).

    The user's row is locked while the balance is read and the charge is
    written, so two deep scans started at the same moment cannot both
    spend the last credit.
    """
    db.execute(
        select(User.id).where(User.id == user_id).with_for_update()
    )

    ensure_welcome_grant(db, user_id)

    balance = get_balance(db, user_id)

    if balance < cost:
        db.commit()  # keeps the welcome grant, releases the lock
        raise InsufficientCredits(balance, cost)

    entry = CreditEntry(
        user_id=user_id,
        delta=-cost,
        reason="deep_scan",
        asset_id=asset_id,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


def refund_charge(
    db: Session,
    charge: CreditEntry,
    *,
    note: str = "No search could be made",
) -> bool:
    """
    Give back a charge. Returns False (and does nothing) if it was
    already refunded, so retrying a refund is always safe.
    """
    try:
        with db.begin_nested():
            db.add(
                CreditEntry(
                    user_id=charge.user_id,
                    delta=-charge.delta,
                    reason="refund",
                    refund_of=charge.id,
                    asset_id=charge.asset_id,
                    note=note,
                )
            )
    except IntegrityError:
        return False

    db.commit()

    return True


def grant_credits(
    db: Session,
    *,
    user_id: int,
    amount: int,
    note: str | None = None,
) -> CreditEntry:
    """Add credits by hand (admin). `amount` must be positive."""
    if amount <= 0:
        raise ValueError("amount must be positive")

    entry = CreditEntry(
        user_id=user_id,
        delta=amount,
        reason="grant",
        note=note,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


def recent_entries(
    db: Session,
    user_id: int,
    limit: int = 20,
) -> list[CreditEntry]:
    return list(
        db.scalars(
            select(CreditEntry)
            .where(CreditEntry.user_id == user_id)
            .order_by(CreditEntry.id.desc())
            .limit(limit)
        )
    )
