"use client";

import { useEffect, useState } from "react";

import { api, type AdminOverview } from "@/lib/api";
import { Panel } from "@/components/ui/Panel";
import { ErrorLine, Stat } from "./ui";

function percent(used: number, limit: number): number {
  return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
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
  const dailyUsed = percent(data.serpapi.used_today, data.serpapi.daily_limit);
  const monthlyUsed = percent(
    data.serpapi.used_this_month,
    data.serpapi.monthly_limit,
  );

  return (
    <div className="space-y-6">
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

        <Panel className="p-5">
          <h2 className="font-heading text-[16px] font-semibold">
            Deep scan allowance (SerpApi)
          </h2>

          {(
            [
              ["Today", data.serpapi.used_today, data.serpapi.daily_limit, dailyUsed],
              [
                "This month",
                data.serpapi.used_this_month,
                data.serpapi.monthly_limit,
                monthlyUsed,
              ],
            ] as const
          ).map(([label, used, limit, pct]) => (
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
          ))}

          <p className="mt-5 text-[12px] text-[var(--text-muted)]">
            The activity log (IP addresses, browsers) is deleted after{" "}
            {data.event_retention_days} days.
          </p>
        </Panel>
      </div>
    </div>
  );
}
