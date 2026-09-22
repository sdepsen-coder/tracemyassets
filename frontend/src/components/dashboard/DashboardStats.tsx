"use client";

import { useAssetStats } from "./AssetStatsProvider";
import { StatCard } from "./StatCard";

export function DashboardStats() {
  const { stats, loading, error, refresh } = useAssetStats();

  const total = loading
    ? "..."
    : stats
      ? stats.total.toLocaleString("en-US")
      : "—";

  const protectedCount = loading
    ? "..."
    : stats
      ? stats.active.toLocaleString("en-US")
      : "—";

  const archivedCount = loading
    ? "..."
    : stats
      ? stats.archived.toLocaleString("en-US")
      : "—";

  const protectionRate =
    stats && stats.total > 0
      ? `${Math.round((stats.active / stats.total) * 100)}% protected`
      : "No assets yet";

  return (
    <section aria-label="Artwork summary" className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total artworks"
          value={total}
          sublabel={loading ? "Loading account data" : "Registered to your account"}
          icon="collections"
          tone="primary"
        />

        <StatCard
          label="Protected artworks"
          value={protectedCount}
          sublabel={loading ? "Loading protection status" : protectionRate}
          icon="verified_user"
          tone="success"
        />

        <StatCard
          label="Archived artworks"
          value={archivedCount}
          sublabel="Stored in your account"
          icon="inventory_2"
          tone="neutral"
        />

        <StatCard
          label="Image checks"
          value="—"
          sublabel="Coming next"
          icon="manage_search"
          tone="warning"
          footer="Manual verification tools are ready"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-4"
        >
          <p className="text-sm text-[var(--danger)]">{error}</p>

          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--surface)] disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}