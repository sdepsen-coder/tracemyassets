"use client";

import { useEffect, useState } from "react";

import { api, type AdminOverview } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { formatMoney } from "./format";
import { ErrorLine, Stat } from "./ui";

function percent(used: number, limit: number): number {
  return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
}

type Budget = AdminOverview["serpapi"];

function AllowancePanel({ title, budget }: { title: string; budget: Budget }) {
  return (
    <Panel className="p-5">
      <h2 className="font-heading text-[16px] font-semibold">{title}</h2>

      {(
        [
          ["Today", budget.used_today, budget.daily_limit],
          ["This month", budget.used_this_month, budget.monthly_limit],
        ] as const
      ).map(([label, used, limit]) => {
        const pct = percent(used, limit);

        return (
          <div key={label} className="mt-4">
            <div className="flex justify-between text-[13px]">
              <span>{label}</span>
              <span className="text-[var(--text-muted)]">
                {used} of {limit} ({pct}%)
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
              <div
                className={[
                  "h-full rounded-full",
                  pct >= 80
                    ? "bg-[var(--danger)]"
                    : "bg-[var(--primary-strong)]",
                ].join(" ")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

type Revenue = AdminOverview["revenue_this_month"];

/** Net amounts per currency ("$120.00 · €11.00"); "$0" when nothing came in. */
function netLine(rows: Revenue): string {
  if (rows.length === 0) return formatMoney(0, "USD");

  return rows.map((row) => formatMoney(row.net, row.currency_code)).join(" · ");
}

function revenueHint(rows: Revenue, last: Revenue): string {
  const payments = rows.reduce((sum, row) => sum + row.payments, 0);
  const refunded = rows
    .filter((row) => row.refunded !== 0)
    .map((row) => formatMoney(row.refunded, row.currency_code))
    .join(" · ");

  return [
    `${payments} payment(s)`,
    refunded ? `${refunded} refunded` : "",
    `last month ${netLine(last)}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function nearLimit(budget: Budget): boolean {
  return (
    percent(budget.used_today, budget.daily_limit) >= 80 ||
    percent(budget.used_this_month, budget.monthly_limit) >= 80
  );
}

export function OverviewTab() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api.admin
      .overview(controller.signal)
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not load.");
        }
      });

    return () => controller.abort();
  }, []);

  if (error) return <ErrorLine message={error} />;
  if (!data) return <p className="text-[14px]">Loading…</p>;

  const maxDay = Math.max(1, ...data.sign_ups_by_day.map(([, n]) => n));

  return (
    <div className="space-y-6">
      {nearLimit(data.serpapi) || nearLimit(data.vision) ? (
        <p
          role="alert"
          data-testid="allowance-warning"
          className="rounded-xl bg-rose-400/10 p-3 text-[14px] text-rose-300"
        >
          A paid search allowance is almost used up. When it runs out, scans
          of that kind stop until the next day or month, or until you raise
          the limit (SERPAPI_/VISION_ DAILY and MONTHLY LIMIT in Railway).
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Revenue this month"
          value={netLine(data.revenue_this_month)}
          hint={revenueHint(data.revenue_this_month, data.revenue_last_month)}
        />
        <Stat
          label="Paid subscribers"
          value={data.paid_subscribers}
          hint={
            Object.entries(data.paid_subscribers_by_plan)
              .map(([plan, count]) => `${plan} ${count}`)
              .join(" · ") || "None yet"
          }
        />
        <Stat
          label="Cancelling at period end"
          value={data.subscriptions_canceling}
          hint="Still paid up; will not renew"
        />
        <Stat
          label="Payment failed"
          value={data.subscriptions_past_due}
          hint="Paddle is retrying the card"
          tone={data.subscriptions_past_due > 0 ? "danger" : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Accounts"
          value={data.users_total}
          hint={`+${data.users_new_24h} today, +${data.users_new_7d} this week`}
        />
        <Stat
          label="Active users"
          value={data.users_active_24h}
          hint={`${data.users_active_7d} in the last 7 days`}
        />
        <Stat label="Artworks" value={data.assets_total} />
        <Stat
          label="Failed sign-ins (24h)"
          value={data.failed_sign_ins_24h}
          tone={data.failed_sign_ins_24h >= 10 ? "danger" : undefined}
        />
        <Stat
          label="Scans (24h)"
          value={data.scans_24h}
          hint={`${data.scans_7d} in 7 days`}
        />
        <Stat
          label="Deep scans (24h)"
          value={data.deep_scans_24h}
          hint={`${data.deep_scans_7d} in 7 days`}
        />
        <Stat
          label="Feedback"
          value={data.feedback_total}
          hint={`${data.feedback_7d} this week`}
        />
        <Stat
          label="Suspended"
          value={data.suspended_users}
          tone={data.suspended_users > 0 ? "danger" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="font-heading text-[16px] font-semibold">
            Sign-ups, last 14 days
          </h2>

          <div
            className="mt-4 flex h-32 items-end gap-1.5"
            role="img"
            aria-label="Sign-ups per day for the last 14 days"
          >
            {data.sign_ups_by_day.map(([day, count]) => (
              <div
                key={day}
                className="flex flex-1 flex-col items-center justify-end gap-1"
                title={`${day}: ${count}`}
              >
                <span className="text-[10px] text-[var(--text-muted)]">
                  {count > 0 ? count : ""}
                </span>
                <div
                  className="w-full rounded-t bg-[var(--primary-strong)]"
                  style={{
                    height: `${Math.max(count > 0 ? 6 : 2, (count / maxDay) * 90)}px`,
                    opacity: count > 0 ? 1 : 0.25,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="mt-1 flex justify-between text-[11px] text-[var(--text-muted)]">
            <span>{data.sign_ups_by_day[0]?.[0]}</span>
            <span>{data.sign_ups_by_day.at(-1)?.[0]}</span>
          </div>
        </Panel>

        <div className="space-y-6">
          <AllowancePanel
            title="Deep scan allowance (SerpApi)"
            budget={data.serpapi}
          />
          <AllowancePanel
            title="Standard scan allowance (Google Vision)"
            budget={data.vision}
          />
          <p className="text-[12px] text-[var(--text-muted)]">
            The activity log (IP addresses, browsers) is deleted after{" "}
            {data.event_retention_days} days.
          </p>
        </div>
      </div>
    </div>
  );
}
