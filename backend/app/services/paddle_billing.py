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
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.plan_limits import DEFAULT_PLAN
from app.models.paddle import PaddleEvent, PaddleSubscription
from app.models.user import User
from app.services.plan_credits import ACCESS_STATUSES, grant_due_plan_credits

logger = logging.getLogger("tracemyassets.paddle")

PAID_PLANS = ("Pro", "Extra")
PLAN_RANK = {"Free": 0, "Pro": 1, "Extra": 2}


def billing_enabled() -> bool:
    return bool(settings.paddle_webhook_secret)


def api_base() -> str:
    if settings.paddle_environment == "live":
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

    if user is not None:
        recompute_plan(db, user)
        grant_due_plan_credits(db, user.id)

    return f"applied: {subscription.status} {subscription.plan}"


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

    try:
        if event_type in HANDLED:
            result = apply_subscription_event(db, event)
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
_discovered_at = 0.0
_DISCOVERY_SECONDS = 300
_DISCOVERY_RETRY_SECONDS = 30


def reset_price_cache() -> None:
    global _discovered, _discovered_at
    _discovered, _discovered_at = {}, 0.0


def discover_prices() -> dict[str, tuple[str, str]]:
    """
    Our prices as Paddle lists them, found by amount and interval (see
    PRICE_CATALOG). Cached; a failure is retried after half a minute.
    """
    global _discovered, _discovered_at

    now = time.time()

    if _discovered_at and now - _discovered_at < (
        _DISCOVERY_SECONDS if _discovered else _DISCOVERY_RETRY_SECONDS
    ):
        return _discovered

    found: dict[str, tuple[str, str]] = {}

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

                        if (
                            kind
                            and price.get("id")
                            and price.get("status") != "archived"
                        ):
                            found[str(price["id"])] = kind

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

    _discovered, _discovered_at = found, now

    return found


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
