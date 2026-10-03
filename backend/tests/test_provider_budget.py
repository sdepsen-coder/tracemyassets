import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.provider_usage import ProviderUsage
from app.services.provider_budget import (
    ProviderBudgetExceeded,
    get_budget_status,
    reserve_units,
)

NOW = datetime(2026, 10, 15, 12, 0, tzinfo=timezone.utc)
LIMITS = {"daily_limit": 3, "monthly_limit": 5}


def make_session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    return sessionmaker(bind=engine)


class BudgetTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.session_factory = make_session_factory()
        self.db = self.session_factory()
        self.addCleanup(self.db.close)

    def _usage(
        self,
        when: datetime,
        *,
        units: int = 1,
        provider: str = "serpapi",
    ) -> None:
        self.db.add(
            ProviderUsage(provider=provider, units=units, created_at=when)
        )
        self.db.commit()

    def _status(self, provider: str = "serpapi"):
        return get_budget_status(self.db, provider, now=NOW, **LIMITS)


class BudgetStatusTests(BudgetTestCase):
    def test_nothing_used_yet(self) -> None:
        status = self._status()

        self.assertEqual(status.used_today, 0)
        self.assertEqual(status.used_this_month, 0)
        self.assertEqual(status.remaining_today, 3)
        self.assertEqual(status.remaining_this_month, 5)
        self.assertIsNone(status.blocked_period())

    def test_today_counts_for_both_day_and_month(self) -> None:
        self._usage(datetime(2026, 10, 15, 1, 0, tzinfo=timezone.utc), units=2)

        status = self._status()

        self.assertEqual(status.used_today, 2)
        self.assertEqual(status.used_this_month, 2)

    def test_yesterday_counts_for_the_month_only(self) -> None:
        self._usage(datetime(2026, 10, 14, 23, 59, tzinfo=timezone.utc), units=2)

        status = self._status()

        self.assertEqual(status.used_today, 0)
        self.assertEqual(status.used_this_month, 2)

    def test_last_month_counts_for_neither(self) -> None:
        self._usage(datetime(2026, 9, 30, 23, 59, tzinfo=timezone.utc), units=4)

        status = self._status()

        self.assertEqual(status.used_today, 0)
        self.assertEqual(status.used_this_month, 0)

    def test_the_first_second_of_the_month_counts(self) -> None:
        self._usage(datetime(2026, 10, 1, 0, 0, 0, tzinfo=timezone.utc))

        self.assertEqual(self._status().used_this_month, 1)

    def test_providers_are_counted_separately(self) -> None:
        self._usage(NOW, units=3, provider="other")

        self.assertEqual(self._status("serpapi").used_today, 0)
        self.assertEqual(self._status("other").used_today, 3)

    def test_daily_limit_blocks_first(self) -> None:
        self._usage(NOW, units=3)

        self.assertEqual(self._status().blocked_period(), "daily")

    def test_monthly_limit_blocks_when_the_day_still_has_room(self) -> None:
        self._usage(datetime(2026, 10, 3, 9, 0, tzinfo=timezone.utc), units=3)
        self._usage(datetime(2026, 10, 10, 9, 0, tzinfo=timezone.utc), units=2)

        status = self._status()

        self.assertEqual(status.used_today, 0)
        self.assertEqual(status.blocked_period(), "monthly")

    def test_remaining_never_goes_negative(self) -> None:
        self._usage(NOW, units=9)

        status = self._status()

        self.assertEqual(status.remaining_today, 0)
        self.assertEqual(status.remaining_this_month, 0)

    def test_a_naive_clock_is_treated_as_utc(self) -> None:
        self._usage(NOW)

        status = get_budget_status(
            self.db,
            "serpapi",
            now=datetime(2026, 10, 15, 12, 0),
            **LIMITS,
        )

        self.assertEqual(status.used_today, 1)


class ReserveUnitsTests(BudgetTestCase):
    def test_reserving_records_the_spend_with_the_asset(self) -> None:
        reserve_units(
            self.db, "serpapi", 1, asset_id=42, now=NOW, **LIMITS
        )

        # Read through a different session: the spend must be committed.
        other = self.session_factory()
        self.addCleanup(other.close)
        rows = list(other.scalars(select(ProviderUsage)))

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].provider, "serpapi")
        self.assertEqual(rows[0].units, 1)
        self.assertEqual(rows[0].asset_id, 42)

    def test_the_last_allowed_call_goes_through_and_the_next_is_refused(
        self,
    ) -> None:
        for _ in range(3):
            reserve_units(self.db, "serpapi", 1, now=NOW, **LIMITS)

        with self.assertRaises(ProviderBudgetExceeded) as caught:
            reserve_units(self.db, "serpapi", 1, now=NOW, **LIMITS)

        self.assertEqual(caught.exception.period, "daily")
        self.assertEqual(caught.exception.provider, "serpapi")

    def test_a_refused_call_records_nothing(self) -> None:
        self._usage(NOW, units=3)

        with self.assertRaises(ProviderBudgetExceeded):
            reserve_units(self.db, "serpapi", 1, now=NOW, **LIMITS)

        self.assertEqual(self._status().used_today, 3)

    def test_monthly_limit_refuses_even_with_daily_room(self) -> None:
        self._usage(datetime(2026, 10, 2, 9, 0, tzinfo=timezone.utc), units=5)

        with self.assertRaises(ProviderBudgetExceeded) as caught:
            reserve_units(self.db, "serpapi", 1, now=NOW, **LIMITS)

        self.assertEqual(caught.exception.period, "monthly")

    def test_several_units_at_once_must_all_fit(self) -> None:
        self._usage(NOW, units=2)

        with self.assertRaises(ProviderBudgetExceeded):
            reserve_units(self.db, "serpapi", 2, now=NOW, **LIMITS)

        reserve_units(self.db, "serpapi", 1, now=NOW, **LIMITS)

        self.assertEqual(self._status().used_today, 3)


if __name__ == "__main__":
    unittest.main()
