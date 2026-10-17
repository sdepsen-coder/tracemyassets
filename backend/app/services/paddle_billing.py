"""
Paddle Billing: webhook checking, subscriptions, and the user's plan.

Paddle is the seller (it takes the payment and handles VAT). We only
learn about a purchase from its signed webhooks, and everything else
follows from the subscription it reports:

  * the plan comes from the price (our PADDLE_PRICE_* settings, else the
    price's own custom data `plan`);
  * active, trialing and past_due keep the plan (past_due is a failed
    renewal Paddle is still retrying); paused and canceled go back to
    Free; a cancellation scheduled for the end of the period keeps the
    plan until then;
  * users with the Internal plan are never touched.

Paddle delivers at least once and not in order, so every event id is
recorded once, and an event older than the last one applied is ignored.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plan_limits import DEFAULT_PLAN
from app.models.paddle import (
    PaddleAdjustment,
    PaddleEvent,
    PaddleSubscription,
    PaddleTransaction,
)
from app.models.user import User
from app.services.credits import grant_purchase, reverse_purchase
from app.services.plan_credits import ACCESS_STATUSES, grant_due_plan_credits

logger = logging.getLogger("tracemyassets.paddle")

PAID_PLANS = ("Pro", "Extra")
PLAN_RANK = {"Free": 0, "Pro": 1, "Extra": 2}


def billing_enabled() -> bool:
    return bool(settings.paddle_webhook_secret)


def api_base() -> str:
    if settings.paddle_environment == "production":
        return "https://api.paddle.com"

    return "https://sandbox-api.paddle.com"


# ---------------------------------------------------------------- signature


def verify_signature(
    raw_body: bytes,
    header: str | None,
    secret: str,
    *,
    tolerance_seconds: int = 300,
    now: float | None = None,
) -> bool:
    """
    Check Paddle's `Paddle-Signature: ts=...;h1=...` header: HMAC-SHA256 of
    `ts:` + the exact body, keyed by the endpoint secret. Several h1
    values can be present while Paddle rotates a secret; one match is
    enough. A timestamp too far from now is refused (replay).
    """
    if not header or not secret:
        return False

    timestamp = ""
    signatures: list[str] = []

    for part in header.split(";"):
        key, _, value = part.strip().partition("=")

        if key == "ts":
            timestamp = value
        elif key == "h1" and value:
            signatures.append(value)

    if not timestamp.isdigit() or not signatures:
        return False

    current = time.time() if now is None else now

    if abs(current - int(timestamp)) > tolerance_seconds:
        return False

    expected = hmac.new(
        secret.encode(),
        timestamp.encode() + b":" + raw_body,
        hashlib.sha256,
    ).hexdigest()

    return any(hmac.compare_digest(expected, item) for item in signatures)


# ------------------------------------------------------------------ parsing


def parse_time(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


# What our four prices are, by amount (minor units, USD) and interval.
# Lets the app recognise them without anyone copying price ids around.
PRICE_CATALOG: dict[tuple[int, str], tuple[str, str]] = {
    (1299, "month"): ("Pro", "month"),
    (12000, "year"): ("Pro", "year"),
    (2999, "month"): ("Extra", "month"),
    (24000, "year"): ("Extra", "year"),
}


def classify_price(price: Any) -> tuple[str, str] | None:
    """(plan, interval) of a Paddle price object, or None if not ours."""
    if not isinstance(price, dict):
        return None

    cycle = price.get("billing_cycle")
    unit = price.get("unit_price")

    if isinstance(cycle, dict) and isinstance(unit, dict):
        try:
            amount = int(unit.get("amount"))
        except (TypeError, ValueError):
            amount = -1

        interval = cycle.get("interval")

        if (
            unit.get("currency_code") == "USD"
            and cycle.get("frequency") in (1, None)
            and (amount, interval) in PRICE_CATALOG
        ):
            return PRICE_CATALOG[(amount, interval)]

    custom = price.get("custom_data")
    plan = custom.get("plan") if isinstance(custom, dict) else None

    if plan in PAID_PLANS:
        interval = custom.get("interval")

        if interval not in ("month", "year") and isinstance(cycle, dict):
            interval = cycle.get("interval")

        if interval in ("month", "year"):
            return plan, interval

    return None


# One-time Deep scan credit packs, by amount (minor units, USD) -> credits.
PACK_CATALOG: dict[int, int] = {
    499: 10,
    999: 25,
    1999: 60,
}


def pack_price_amount(credits: int) -> int | None:
    for amount, size in PACK_CATALOG.items():
        if size == credits:
            return amount

    return None


def classify_pack(price: Any) -> int | None:
    """Credits in a one-time Paddle price (a credit pack), else None."""
    if not isinstance(price, dict):
        return None

    # A subscription price is never a pack.
    if price.get("billing_cycle"):
        return None

    unit = price.get("unit_price")

    if isinstance(unit, dict) and unit.get("currency_code") == "USD":
        try:
            amount = int(unit.get("amount"))
        except (TypeError, ValueError):
            amount = -1

        if amount in PACK_CATALOG:
            return PACK_CATALOG[amount]

    custom = price.get("custom_data")
    credits = custom.get("credits") if isinstance(custom, dict) else None

    if isinstance(credits, int) and not isinstance(credits, bool):
        if 1 <= credits <= 1000:
            return credits

    return None


def _pack_entry(price: dict[str, Any]) -> tuple[int, int]:
    """(credits, price in minor units) of a price classify_pack accepted."""
    credits = int(classify_pack(price) or 0)

    try:
        amount = int((price.get("unit_price") or {}).get("amount"))
    except (TypeError, ValueError):
        amount = pack_price_amount(credits) or 0

    return credits, amount


def plan_from_items(items: Any) -> tuple[str | None, str | None, str | None]:
    """(plan, interval, price_id) of the first priced item we recognise."""
    if not isinstance(items, list):
        return None, None, None

    for item in items:
        price = item.get("price") if isinstance(item, dict) else None

        if not isinstance(price, dict):
            continue

        price_id = price.get("id")
        known = settings.paddle_prices.get(price_id) or classify_price(price)

        if known:
            return known[0], known[1], price_id

    return None, None, None


def pack_credits_from_items(items: Any) -> int:
    """Deep scan credits bought in a transaction's items (0 if none)."""
    total = 0

    for item in items if isinstance(items, list) else []:
        price = item.get("price") if isinstance(item, dict) else None

        if not isinstance(price, dict):
            continue

        credits = classify_pack(price) or _discovered_packs.get(
            str(price.get("id")), (0, 0)
        )[0]

        try:
            quantity = max(int(item.get("quantity") or 1), 1)
        except (TypeError, ValueError):
            quantity = 1

        total += credits * quantity

    return total


def _user_id_from(data: dict[str, Any]) -> int | None:
    custom = data.get("custom_data")

    if isinstance(custom, dict):
        try:
            return int(custom.get("user_id"))
        except (TypeError, ValueError):
            return None

    return None


# ---------------------------------------------------------------- the plan


def has_access(subscription: PaddleSubscription, now: datetime) -> bool:
    if subscription.plan not in PAID_PLANS:
        return False

    if subscription.status not in ACCESS_STATUSES:
        return False

    scheduled = _aware(subscription.scheduled_at)

    if (
        subscription.scheduled_action == "cancel"
        and scheduled is not None
        and scheduled <= now
    ):
        return False

    return True


def recompute_plan(
    db: Session, user: User, *, now: datetime | None = None
) -> str:
    """Set user.plan_type from the user's subscriptions. Does not commit."""
    current = now or datetime.now(timezone.utc)

    if user.plan_type == "Internal":
        return user.plan_type

    best = DEFAULT_PLAN

    for subscription in db.scalars(
        select(PaddleSubscription).where(
            PaddleSubscription.user_id == user.id
        )
    ):
        if (
            has_access(subscription, current)
            and PLAN_RANK[subscription.plan] > PLAN_RANK[best]
        ):
            best = subscription.plan

    if user.plan_type != best:
        logger.info("User %s plan %s -> %s", user.id, user.plan_type, best)
        user.plan_type = best

    return best


# ------------------------------------------------------------------- events


def apply_subscription_event(
    db: Session, event: dict[str, Any]
) -> str:
    data = event.get("data")

    if not isinstance(data, dict) or not data.get("id"):
        return "ignored: no subscription"

    subscription_id = str(data["id"])
    occurred = parse_time(event.get("occurred_at"))

    subscription = db.get(PaddleSubscription, subscription_id)

    if subscription is None:
        user_id = _user_id_from(data)
        user = db.get(User, user_id) if user_id else None

        if user is None:
            logger.warning(
                "Paddle subscription %s has no matching user", subscription_id
            )
            return "ignored: unknown user"

        subscription = PaddleSubscription(
            subscription_id=subscription_id,
            user_id=user.id,
            customer_id=str(data.get("customer_id") or ""),
            status=str(data.get("status") or "active"),
        )
        db.add(subscription)
    else:
        user = db.get(User, subscription.user_id)

        last = _aware(subscription.last_event_at)

        if occurred is not None and last is not None and occurred < last:
            return "ignored: older than the state we have"

    subscription.customer_id = str(
        data.get("customer_id") or subscription.customer_id or ""
    )
    subscription.status = str(data.get("status") or subscription.status)

    plan, interval, price_id = plan_from_items(data.get("items"))

    if plan:
        subscription.plan = plan
        subscription.interval = interval
        subscription.price_id = price_id

    started = parse_time(data.get("started_at")) or parse_time(
        data.get("first_billed_at")
    )

    if started and subscription.started_at is None:
        subscription.started_at = started

    period = data.get("current_billing_period")

    if isinstance(period, dict):
        subscription.current_period_end = parse_time(period.get("ends_at"))

    change = data.get("scheduled_change")

    if isinstance(change, dict):
        subscription.scheduled_action = str(change.get("action") or "")[:20] or None
        subscription.scheduled_at = parse_time(change.get("effective_at"))
    else:
        subscription.scheduled_action = None
        subscription.scheduled_at = None

    if occurred is not None:
        subscription.last_event_at = occurred

    db.flush()

    # A renewal paid before we could tell whose it was belongs to this user.
    db.execute(
        update(PaddleTransaction)
        .where(
            PaddleTransaction.subscription_id == subscription_id,
            PaddleTransaction.user_id.is_(None),
        )
        .values(user_id=subscription.user_id)
    )

    if user is not None:
        recompute_plan(db, user)
        grant_due_plan_credits(db, user.id)

    return f"applied: {subscription.status} {subscription.plan}"


def apply_transaction_event(db: Session, event: dict[str, Any]) -> str:
    """A completed one-time payment: add the credits of a credit pack."""
    data = event.get("data")

    if not isinstance(data, dict) or not data.get("id"):
        return "ignored: no transaction"

    if data.get("status") != "completed":
        return "ignored: not completed"

    total = pack_credits_from_items(data.get("items"))

    if total <= 0:
        return "ignored: not a credit pack"

    user_id = _user_id_from(data)
    user = db.get(User, user_id) if user_id else None

    if user is None:
        # Money was taken but we cannot tell whose it is: shout.
        logger.error(
            "Paddle transaction %s paid for %s credits but has no matching user",
            data["id"],
            total,
        )
        return "ignored: unknown user"

    if not grant_purchase(
        db, user_id=user.id, credits=total, transaction_id=str(data["id"])
    ):
        return "ignored: already credited"

    return f"applied: +{total} credits for user {user.id}"


def apply_adjustment_event(db: Session, event: dict[str, Any]) -> str:
    """A refund or chargeback: take back the unspent credits of the pack."""
    data = event.get("data")

    if not isinstance(data, dict):
        return "ignored: no adjustment"

    if data.get("status") != "approved":
        return "ignored: not approved"

    if data.get("action") not in ("refund", "chargeback"):
        return "ignored: not a refund"

    transaction_id = data.get("transaction_id")

    if not transaction_id:
        return "ignored: no transaction"

    if data.get("type") != "full":
        logger.warning(
            "Partial refund on transaction %s: credits are left as they are; "
            "adjust by hand if needed.",
            transaction_id,
        )
        return "ignored: partial refund"

    reversed_ = reverse_purchase(db, transaction_id=str(transaction_id))

    if reversed_ is None:
        return "ignored: no credit purchase to reverse"

    return f"applied: -{reversed_[1]} credits for user {reversed_[0]}"


# ---------------------------------------------------------- payment record
#
# Every completed payment and every refund or chargeback is kept as Paddle
# reported it, so the admin pages can show who paid what and when. The
# amounts are Paddle's own totals: nothing is computed from our prices.


def _minor(value: Any) -> int | None:
    """Paddle amounts are strings in the lowest currency unit ("1299")."""
    if value is None or isinstance(value, bool):
        return None

    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def match_user_id(db: Session, data: dict[str, Any]) -> int | None:
    """
    The account a transaction or adjustment belongs to: the user id the
    checkout put in custom data, else the owner of its subscription or of
    an earlier payment by the same Paddle customer.
    """
    user_id = _user_id_from(data)

    if user_id and db.get(User, user_id) is not None:
        return user_id

    subscription_id = data.get("subscription_id")

    if subscription_id:
        subscription = db.get(PaddleSubscription, str(subscription_id))

        if subscription is not None:
            return subscription.user_id

    customer_id = data.get("customer_id")

    if customer_id:
        found = db.scalar(
            select(PaddleSubscription.user_id)
            .where(PaddleSubscription.customer_id == str(customer_id))
            .limit(1)
        ) or db.scalar(
            select(PaddleTransaction.user_id)
            .where(
                PaddleTransaction.customer_id == str(customer_id),
                PaddleTransaction.user_id.is_not(None),
            )
            .limit(1)
        )

        if found:
            return int(found)

    return None


def record_transaction(
    db: Session, data: Any, *, occurred: datetime | None = None
) -> str:
    """Keep one completed payment. Once per transaction. Does not commit."""
    if not isinstance(data, dict) or not data.get("id"):
        return "not recorded: no transaction"

    if data.get("status") != "completed":
        return "not recorded: not completed"

    transaction_id = str(data["id"])[:60]
    existing = db.get(PaddleTransaction, transaction_id)

    if existing is not None:
        if existing.user_id is None:
            existing.user_id = match_user_id(db, data)

        return "already recorded"

    details = data.get("details")
    totals = details.get("totals") if isinstance(details, dict) else None
    totals = totals if isinstance(totals, dict) else {}
    currency = str(
        totals.get("currency_code") or data.get("currency_code") or ""
    ).upper()[:3]

    items = data.get("items")
    plan, interval, _ = plan_from_items(items)
    credits = pack_credits_from_items(items)

    if plan or data.get("subscription_id"):
        kind = "plan"
    elif credits > 0:
        kind = "pack"
    else:
        kind = "other"

    user_id = match_user_id(db, data)

    if user_id is None:
        logger.error(
            "Paddle transaction %s was paid but has no matching user; "
            "it is recorded without one.",
            transaction_id,
        )

    # grand_total is what the customer paid (after discounts and credit).
    total = _minor(totals.get("grand_total"))

    if total is None:
        total = _minor(totals.get("total")) or 0

    try:
        with db.begin_nested():
            db.add(
                PaddleTransaction(
                    transaction_id=transaction_id,
                    user_id=user_id,
                    subscription_id=(
                        str(data["subscription_id"])[:60]
                        if data.get("subscription_id")
                        else None
                    ),
                    customer_id=(
                        str(data["customer_id"])[:60]
                        if data.get("customer_id")
                        else None
                    ),
                    kind=kind,
                    plan=plan,
                    interval=interval,
                    credits=credits if kind == "pack" else None,
                    status=str(data.get("status"))[:20],
                    origin=str(data.get("origin") or "")[:40] or None,
                    currency_code=currency,
                    subtotal=_minor(totals.get("subtotal")) or 0,
                    tax=_minor(totals.get("tax")) or 0,
                    total=total,
                    fee=_minor(totals.get("fee")),
                    earnings=_minor(totals.get("earnings")),
                    billed_at=(
                        parse_time(data.get("billed_at"))
                        or parse_time(data.get("created_at"))
                        or occurred
                        or datetime.now(timezone.utc)
                    ),
                )
            )
    except IntegrityError:
        return "already recorded"

    return f"recorded {kind} payment {transaction_id}"


def record_adjustment(
    db: Session, data: Any, *, occurred: datetime | None = None
) -> str:
    """Keep the latest state of one refund, credit or chargeback."""
    if not isinstance(data, dict):
        return "not recorded: no adjustment"

    adjustment_id = str(data.get("id") or "")[:60]
    transaction_id = str(data.get("transaction_id") or "")[:60]

    if not adjustment_id or not transaction_id:
        return "not recorded: no adjustment"

    updated = parse_time(data.get("updated_at")) or occurred
    row = db.get(PaddleAdjustment, adjustment_id)

    if row is not None:
        last = _aware(row.paddle_updated_at)

        if updated is not None and last is not None and updated < last:
            return "not recorded: older than the state we have"

    payment = db.get(PaddleTransaction, transaction_id)
    totals = data.get("totals")
    totals = totals if isinstance(totals, dict) else {}
    currency = str(
        totals.get("currency_code")
        or data.get("currency_code")
        or (payment.currency_code if payment else "")
    ).upper()[:3]

    if row is None:
        row = PaddleAdjustment(
            adjustment_id=adjustment_id,
            transaction_id=transaction_id,
            user_id=(
                payment.user_id
                if payment is not None and payment.user_id
                else match_user_id(db, data)
            ),
            paddle_created_at=(
                parse_time(data.get("created_at"))
                or occurred
                or datetime.now(timezone.utc)
            ),
        )
        db.add(row)

    row.action = str(data.get("action") or "")[:30]
    row.type = str(data.get("type") or "")[:10] or None
    row.status = str(data.get("status") or "")[:20]
    row.reason = str(data.get("reason") or "")[:500] or None
    row.currency_code = currency
    row.total = _minor(totals.get("total")) or 0
    row.paddle_updated_at = updated

    db.flush()

    return f"recorded {row.action} {row.status} on {transaction_id}"


HANDLED = {
    "subscription.created",
    "subscription.activated",
    "subscription.updated",
    "subscription.past_due",
    "subscription.paused",
    "subscription.resumed",
    "subscription.canceled",
    "subscription.trialing",
}


def handle_event(db: Session, event: dict[str, Any]) -> str:
    """
    Apply one verified webhook event, once. Commits. Returns a short note
    for the log; never raises for events we simply do not care about.
    """
    event_id = str(event.get("event_id") or "")
    event_type = str(event.get("event_type") or "")

    if not event_id:
        return "ignored: no event id"

    if db.get(PaddleEvent, event_id) is not None:
        return "duplicate"

    occurred = parse_time(event.get("occurred_at"))

    try:
        if event_type in HANDLED:
            result = apply_subscription_event(db, event)
        elif event_type == "transaction.completed":
            logger.info(
                "Paddle %s: %s",
                event_id,
                record_transaction(db, event.get("data"), occurred=occurred),
            )
            result = apply_transaction_event(db, event)
        elif event_type in ("adjustment.created", "adjustment.updated"):
            logger.info(
                "Paddle %s: %s",
                event_id,
                record_adjustment(db, event.get("data"), occurred=occurred),
            )
            result = apply_adjustment_event(db, event)
        else:
            result = "ignored: not needed"

        db.add(PaddleEvent(event_id=event_id, event_type=event_type[:60]))
        db.commit()
    except IntegrityError:
        # The same event arrived twice at the same moment.
        db.rollback()
        return "duplicate"
    except Exception:
        db.rollback()
        raise

    logger.info("Paddle %s %s -> %s", event_type, event_id, result)

    return result


# ------------------------------------------------------------ Paddle's API


class PaddleApiError(Exception):
    pass


def _api_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.paddle_api_key}"}


def create_portal_url(
    customer_id: str, subscription_ids: list[str]
) -> str:
    """
    A fresh link to Paddle's customer portal (change card, cancel, see
    invoices). Links are short-lived, so one is made per click.
    """
    if not settings.paddle_api_key:
        raise PaddleApiError("Paddle API key is not set.")

    try:
        response = httpx.post(
            f"{api_base()}/customers/{customer_id}/portal-sessions",
            headers=_api_headers(),
            json={"subscription_ids": subscription_ids},
            timeout=10.0,
        )
        response.raise_for_status()
        url = response.json()["data"]["urls"]["general"]["overview"]
    except (httpx.HTTPError, KeyError, ValueError) as error:
        raise PaddleApiError("Could not open the customer portal.") from error

    return str(url)


def cancel_subscription_now(subscription_id: str) -> None:
    """Cancel immediately (used when an account is deleted)."""
    if not settings.paddle_api_key:
        raise PaddleApiError("Paddle API key is not set.")

    try:
        response = httpx.post(
            f"{api_base()}/subscriptions/{subscription_id}/cancel",
            headers=_api_headers(),
            json={"effective_from": "immediately"},
            timeout=10.0,
        )

        # Already canceled counts as done.
        if response.status_code not in (200, 404, 409):
            response.raise_for_status()
    except httpx.HTTPError as error:
        raise PaddleApiError("Could not cancel the subscription.") from error


_discovered: dict[str, tuple[str, str]] = {}
_discovered_packs: dict[str, tuple[int, int]] = {}
_discovered_at = 0.0
_DISCOVERY_SECONDS = 300
_DISCOVERY_RETRY_SECONDS = 30


def reset_price_cache() -> None:
    global _discovered, _discovered_packs, _discovered_at
    _discovered, _discovered_packs, _discovered_at = {}, {}, 0.0


def discover_prices() -> dict[str, tuple[str, str]]:
    """
    Our prices as Paddle lists them, found by amount and interval (see
    PRICE_CATALOG). Cached; a failure is retried after half a minute.
    """
    global _discovered, _discovered_packs, _discovered_at

    now = time.time()

    if _discovered_at and now - _discovered_at < (
        _DISCOVERY_SECONDS if _discovered else _DISCOVERY_RETRY_SECONDS
    ):
        return _discovered

    found: dict[str, tuple[str, str]] = {}
    packs: dict[str, tuple[int, int]] = {}

    if not settings.paddle_api_key:
        logger.warning("PADDLE_API_KEY is empty: prices cannot be listed.")

    if settings.paddle_api_key:
        try:
            response = httpx.get(
                f"{api_base()}/prices",
                headers=_api_headers(),
                params={"per_page": 200},
                timeout=10.0,
            )
            response.raise_for_status()

            listed = response.json().get("data", [])
            skipped = []

            statuses: dict[str, int] = {}

            for price in listed:
                state = str(price.get("status"))
                statuses[state] = statuses.get(state, 0) + 1
                kind = classify_price(price)

                if state == "archived":
                    continue

                if kind and price.get("id"):
                    found[str(price["id"])] = kind
                elif classify_pack(price) and price.get("id"):
                    packs[str(price["id"])] = _pack_entry(price)
                else:
                    unit = price.get("unit_price") or {}
                    cycle = price.get("billing_cycle") or {}
                    skipped.append(
                        f"{unit.get('amount')} {unit.get('currency_code')} "
                        f"{cycle.get('frequency')}x{cycle.get('interval')}"
                    )

            logger.warning(
                "Paddle lists %s price(s) %s; %s recognised. "
                "Not recognised: %s",
                len(listed),
                statuses,
                len(found),
                ", ".join(skipped) or "none",
            )

            if not listed:
                # Some accounts answer /prices with nothing; the products
                # carry their prices too.
                products = httpx.get(
                    f"{api_base()}/products",
                    headers=_api_headers(),
                    params={"per_page": 200, "include": "prices"},
                    timeout=10.0,
                ).json().get("data", [])
                nested = 0

                for product in products:
                    for price in product.get("prices") or []:
                        nested += 1
                        kind = classify_price(price)

                        if price.get("id") and price.get("status") != "archived":
                            if kind:
                                found[str(price["id"])] = kind
                            elif classify_pack(price):
                                packs[str(price["id"])] = _pack_entry(price)

                logger.warning(
                    "Paddle account behind this key has %s product(s): %s; "
                    "%s price(s) inside them, %s recognised.",
                    len(products),
                    ", ".join(
                        f"{item.get('name')} ({item.get('status')})"
                        for item in products
                    )
                    or "none",
                    nested,
                    len(found),
                )
        except httpx.HTTPStatusError as error:
            # Paddle's own error text names the cause (bad key, missing
            # permission, wrong environment); it holds no secret.
            logger.warning(
                "Could not list prices from Paddle: HTTP %s from %s: %s",
                error.response.status_code,
                api_base(),
                error.response.text[:300],
            )
        except (httpx.HTTPError, ValueError, AttributeError) as error:
            logger.warning(
                "Could not list prices from Paddle: %s: %s",
                type(error).__name__,
                error,
            )

    _discovered, _discovered_packs, _discovered_at = found, packs, now

    return found


def pack_table() -> list[dict[str, Any]]:
    """The credit packs on sale: [{"price_id", "credits", "amount"}], small first."""
    discover_prices()

    packs = [
        {"price_id": price_id, "credits": credits, "amount": amount}
        for price_id, (credits, amount) in _discovered_packs.items()
    ]

    return sorted(packs, key=lambda pack: pack["credits"])


def price_table() -> dict[str, dict[str, str]]:
    """{"Pro": {"month": id, "year": id}, ...}: env settings win."""
    table: dict[str, dict[str, str]] = {}

    for source in (discover_prices(), settings.paddle_prices):
        for price_id, (plan, interval) in source.items():
            table.setdefault(plan, {})[interval] = price_id

    return table


def stop_subscriptions_for_deletion(db: Session, user_id: int) -> None:
    """
    Before an account is deleted, end any subscription that could still
    bill. If Paddle cannot be reached, raise PaddleApiError so the account
    is kept: deleting it would leave the person paying for nothing.
    """
    for subscription in db.scalars(
        select(PaddleSubscription).where(
            PaddleSubscription.user_id == user_id,
            PaddleSubscription.status.in_(("active", "trialing", "past_due", "paused")),
        )
    ):
        cancel_subscription_now(subscription.subscription_id)
