"""
Per-plan limits.

Deliberately isolated from enforcement logic (see
app.api.v1.endpoints.assets.update_asset_monitoring) so the actual
numbers are easy to find and change -- these are starting values, not
a locked business decision:

- Free: weekly/monthly scans only, up to 3 monitored assets. At 3
  assets x weekly (~4 scans/month each), that's ~12 provider queries
  per free user per month -- comfortably inside Google Vision's free
  1,000/month tier even with a good number of free signups, per the
  cost discussion in the master prompt (Bolum 8C/8G).
- Pro: daily scans allowed, up to 25 monitored assets. Even at daily
  on all 25 (~750 queries/month), that's still inside the free Vision
  tier per paying user -- so cost is not the constraint on this
  number, it is whatever asset volume feels right to sell as "Pro".

Change PLAN_LIMITS freely; nothing else in the codebase hardcodes
these numbers.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanLimits:
    max_monitored_assets: int
    allowed_scan_frequencies: frozenset[str]


DEFAULT_PLAN = "Free"

PLAN_LIMITS: dict[str, PlanLimits] = {
    "Free": PlanLimits(
        max_monitored_assets=3,
        allowed_scan_frequencies=frozenset({"weekly", "monthly"}),
    ),
    "Pro": PlanLimits(
        max_monitored_assets=25,
        allowed_scan_frequencies=frozenset(
            {"daily", "weekly", "monthly"}
        ),
    ),
}


def get_plan_limits(plan_type: str | None) -> PlanLimits:
    """
    Look up the limits for a plan_type, falling back to the Free
    plan's limits for an unknown or missing value -- never fall back
    to "no limit".
    """
    return PLAN_LIMITS.get(plan_type or DEFAULT_PLAN, PLAN_LIMITS[DEFAULT_PLAN])
