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
- Pro: daily scans allowed, up to 40 monitored assets. Daily on all 40
  is ~1,200 Vision queries a month for one customer, so a few heavy Pro
  users go past the free Vision tier (the paid rate is small next to the
  Pro price). The number is whatever asset volume feels right to sell.
- reveals_match_source: Free users see that a match was found and how
  strong it is (similarity, watermark/signal fields all stay visible
  -- see Bolum 3, we never hide the honest technical signal), but not
  *which* site it's on (source_name, source_url, candidate_page_url,
  candidate_image_url are redacted in the API response for any plan
  where this is False). This is a deliberate, honest upgrade prompt,
  not a fake claim -- see app.services.match_presentation.
- allows_deep_scan: whether the plan may run a deep scan (Google Lens
  through SerpApi), which costs real money per search. Every plan may;
  what limits it is credits (see app.services.credits), not the plan.
  The flag stays so a plan can still be switched off.
- Extra: the top paid plan. Daily scans, up to 100 monitored assets.
- manual_scans_per_month: how many times a month the owner may press
  "Standard scan" by hand (None = no limit). Scheduled scans never count
  against it, and a Deep scan is paid for with credits instead.
- Internal: not a customer-facing plan -- there is no signup path
  that assigns it. It exists only so the founder's own account(s)
  can be tested against without tripping the Free plan's asset limit
  during development. Assign it by hand with
  scripts/set_user_plan.py (never surfaced in pricing/UI copy).

Change PLAN_LIMITS freely; nothing else in the codebase hardcodes
these numbers.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlanLimits:
    max_monitored_assets: int
    allowed_scan_frequencies: frozenset[str]
    reveals_match_source: bool
    allows_deep_scan: bool = False
    manual_scans_per_month: int | None = None
    # Deep scan credits a paid plan adds each billing month. NOT granted by
    # anything yet: it is the figure the payment integration will use, kept
    # here so the pricing page and the code say the same number.
    monthly_deep_scan_credits: int = 0


DEFAULT_PLAN = "Free"

PLAN_LIMITS: dict[str, PlanLimits] = {
    "Free": PlanLimits(
        max_monitored_assets=3,
        allowed_scan_frequencies=frozenset({"weekly", "monthly"}),
        reveals_match_source=False,
        allows_deep_scan=True,
        manual_scans_per_month=5,
    ),
    "Pro": PlanLimits(
        max_monitored_assets=40,
        allowed_scan_frequencies=frozenset(
            {"daily", "weekly", "monthly"}
        ),
        reveals_match_source=True,
        allows_deep_scan=True,
        manual_scans_per_month=30,
        monthly_deep_scan_credits=10,
    ),
    "Extra": PlanLimits(
        max_monitored_assets=100,
        allowed_scan_frequencies=frozenset(
            {"daily", "weekly", "monthly"}
        ),
        reveals_match_source=True,
        allows_deep_scan=True,
        manual_scans_per_month=100,
        monthly_deep_scan_credits=40,
    ),
    "Internal": PlanLimits(
        max_monitored_assets=9999,
        allowed_scan_frequencies=frozenset(
            {"daily", "weekly", "monthly"}
        ),
        reveals_match_source=True,
        allows_deep_scan=True,
    ),
}


def get_plan_limits(plan_type: str | None) -> PlanLimits:
    """
    Look up the limits for a plan_type, falling back to the Free
    plan's limits for an unknown or missing value -- never fall back
    to "no limit".
    """
    return PLAN_LIMITS.get(plan_type or DEFAULT_PLAN, PLAN_LIMITS[DEFAULT_PLAN])