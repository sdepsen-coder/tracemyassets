"use client";

import { useAssetStats } from "./AssetStatsProvider";
import { StatCard } from "./StatCard";

const unavailableMetrics = [
  {
    label: "Active Infringements",
    sublabel: "Scanner not connected",
    icon: "radar",
  },
  {
    label: "Match Accuracy",
    sublabel: "Matching not connected",
    icon: "fingerprint",
  },
  {
    label: "Resolved Cases",
    sublabel: "Takedowns not connected",
    icon: "task_alt",
  },
];

export function DashboardStats() {
  const { stats, loading, error, refresh } = useAssetStats();

  const total = loading
    ? "..."
    : stats
      ? stats.total.toLocaleString("en-US")
      : "—";

  const assetSummary = loading
    ? "Loading account totals..."
    : stats
      ? `${stats.active.toLocaleString("en-US")} active · ${stats.archived.toLocaleString("en-US")} archived`
      : "Totals unavailable";

  return (
    <section aria-label="Dashboard statistics" className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered Assets"
          value={total}
          sublabel={assetSummary}
          tone="text-emerald-300"
          chipClass="bg-emerald-400/10 text-emerald-300"
          icon="verified_user"
          footer="Live account data"
        />

        {unavailableMetrics.map((metric) => (
          <StatCard
            key={metric.label}
            {...metric}
            value="—"
            tone="text-slate-400"
            chipClass="bg-white/5 text-slate-400"
            footer="Not available"
          />
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3"
        >
          <p className="text-sm text-rose-300">{error}</p>

          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="text-sm font-semibold text-sky-300 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}