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
  * Paid plans add their monthly credits (services.plan_credits); other
    credits can be added by hand (scripts/grant_credits.py) and taken
    back by hand (admin, e.g. after a partial refund).

The balance is the sum of an append-only ledger (models.credit_entry).
"""

from __future__ import annotations

import hashlib

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.credit_entry import CreditEntry
from app.models.user import User
from app.services.email_verification import is_verified
from app.services.plan_credits import grant_due_plan_credits

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

    # With email confirmation switched on, the credits wait for it.
    if not is_verified(db, user_id):
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
    grant_due_plan_credits(db, user_id)
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
    grant_due_plan_credits(db, user_id)

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


def remove_credits(
    db: Session,
    *,
    user_id: int,
    amount: int,
    note: str | None = None,
) -> CreditEntry:
    """
    Take credits back by hand (admin), for example after a partial refund
    that Paddle reports but we do not reverse automatically. `amount` must
    be positive. Raises InsufficientCredits rather than take the balance
    below zero. Commits on its own.

    Like a deep scan charge, the user's row is locked while the balance is
    read and the entry written.
    """
    if amount <= 0:
        raise ValueError("amount must be positive")

    db.execute(
        select(User.id).where(User.id == user_id).with_for_update()
    )

    ensure_welcome_grant(db, user_id)
    grant_due_plan_credits(db, user_id)

    balance = get_balance(db, user_id)

    if balance < amount:
        db.commit()  # keeps any grant made above, releases the lock
        raise InsufficientCredits(balance, amount)

    entry = CreditEntry(
        user_id=user_id,
        delta=-amount,
        reason="removal",
        note=note,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


def _purchase_key(prefix: str, transaction_id: str) -> str:
    digest = hashlib.sha1(transaction_id.encode()).hexdigest()

    return f"{prefix}:{digest[:30]}"


def grant_purchase(
    db: Session,
    *,
    user_id: int,
    credits: int,
    transaction_id: str,
) -> bool:
    """
    Add bought credits for one paid transaction. Returns False (and does
    nothing) if that transaction was already credited, so a repeated
    webhook never pays out twice. Bought credits never expire. Does not
    commit.
    """
    if credits <= 0:
        raise ValueError("credits must be positive")

    try:
        with db.begin_nested():
            db.add(
                CreditEntry(
                    user_id=user_id,
                    delta=credits,
                    reason="purchase",
                    grant_key=_purchase_key("tx", transaction_id),
                    note=f"Bought {credits} Deep scan credits",
                )
            )
    except IntegrityError:
        return False

    return True


def reverse_purchase(
    db: Session,
    *,
    transaction_id: str,
) -> tuple[int, int] | None:
    """
    Take back the credits of a fully refunded (or charged back) purchase.
    Only what is still unspent can be taken, so the balance never goes
    below zero. Returns (user_id, credits taken), or None if there is no
    such purchase or it was already reversed. Does not commit.
    """
    bought = db.scalar(
        select(CreditEntry).where(
            CreditEntry.reason == "purchase",
            CreditEntry.grant_key == _purchase_key("tx", transaction_id),
        )
    )

    if bought is None:
        return None

    taken = min(bought.delta, max(get_balance(db, bought.user_id), 0))

    try:
        with db.begin_nested():
            db.add(
                CreditEntry(
                    user_id=bought.user_id,
                    delta=-taken,
                    reason="purchase_refund",
                    grant_key=_purchase_key("rf", transaction_id),
                    note="Credit pack refunded",
                )
            )
    except IntegrityError:
        return None

    return bought.user_id, taken


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
