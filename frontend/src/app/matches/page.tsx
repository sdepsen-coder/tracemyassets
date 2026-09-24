"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthGate, useAuth } from "@/components/AuthGate";
import { Topbar } from "@/components/dashboard/Topbar";
import {
  api,
  ApiError,
  type Asset,
  type MatchRecord,
} from "@/lib/api";

type MatchFilter =
  | "all"
  | "needs_review"
  | "confirmed"
  | "dismissed"
  | "archived";

const filters: Array<{
  value: MatchFilter;
  label: string;
}> = [
  { value: "all", label: "All matches" },
  { value: "needs_review", label: "Needs review" },
  { value: "confirmed", label: "Reviewed" },
  { value: "dismissed", label: "Ignored" },
  { value: "archived", label: "Archived" },
];

type EditableReviewStatus = Extract<
  MatchRecord["review_status"],
  "reviewing" | "confirmed" | "dismissed" | "archived"
>;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatus(value: MatchRecord["review_status"]): string {
  switch (value) {
    case "new":
      return "New match";
    case "reviewing":
      return "Reviewing";
    case "confirmed":
      return "Reviewed";
    case "dismissed":
      return "Ignored";
    case "archived":
      return "Archived";
    default:
      return value;
  }
}

function formatSignal(value: MatchRecord["overall_signal"]): string {
  switch (value) {
    case "WATERMARK_VERIFIED":
      return "Watermark verified";
    case "STRONG_VISUAL_MATCH":
      return "Strong visual match";
    case "POSSIBLE_VISUAL_MATCH":
      return "Possible visual match";
    case "WEAK_VISUAL_SIGNAL":
      return "Limited visual similarity";
    default:
      return "No strong match";
  }
}

function statusClasses(status: MatchRecord["review_status"]): string {
  switch (status) {
    case "new":
    case "reviewing":
      return "bg-[var(--warning-soft)] text-[var(--warning)]";
    case "confirmed":
      return "bg-[var(--success-soft)] text-[var(--success)]";
    case "dismissed":
    case "archived":
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function signalClasses(signal: MatchRecord["overall_signal"]): string {
  switch (signal) {
    case "WATERMARK_VERIFIED":
      return "bg-[var(--success-soft)] text-[var(--success)]";
    case "STRONG_VISUAL_MATCH":
    case "POSSIBLE_VISUAL_MATCH":
      return "bg-[var(--warning-soft)] text-[var(--warning)]";
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function MatchesContent() {
  const { logout } = useAuth();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<MatchFilter>("needs_review");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingMatchId, setUpdatingMatchId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [matchResult, assetResult] = await Promise.all([
          api.listMatches(undefined, 0, 100, controller.signal),
          api.listAssets(0, 100, controller.signal),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setMatches(matchResult);
        setAssets(assetResult);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          await logout();
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "Matches could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => controller.abort();
  }, [logout]);

  async function updateMatchStatus(
    matchId: number,
    reviewStatus: EditableReviewStatus,
  ) {
    if (updatingMatchId !== null) {
      return;
    }

    setUpdatingMatchId(matchId);
    setActionError("");

    try {
      const updatedMatch = await api.updateMatch(matchId, {
        review_status: reviewStatus,
      });

      setMatches((current) =>
        current.map((match) =>
          match.id === updatedMatch.id ? updatedMatch : match,
        ),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout();
        return;
      }

      setActionError(
        err instanceof ApiError
          ? err.message
          : "The match status could not be updated.",
      );
    } finally {
      setUpdatingMatchId(null);
    }
  }

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const counts = useMemo(() => {
    return {
      all: matches.length,
      needs_review: matches.filter(
        (match) =>
          match.review_status === "new" ||
          match.review_status === "reviewing",
      ).length,
      confirmed: matches.filter(
        (match) => match.review_status === "confirmed",
      ).length,
      dismissed: matches.filter(
        (match) => match.review_status === "dismissed",
      ).length,
      archived: matches.filter(
        (match) => match.review_status === "archived",
      ).length,
    };
  }, [matches]);

  const visibleMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return matches.filter((match) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "needs_review"
            ? match.review_status === "new" ||
              match.review_status === "reviewing"
            : match.review_status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const asset = assetsById.get(match.asset_id);

      return [
        asset?.title,
        match.source_name,
        match.source_url,
        match.candidate_page_url,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    });
  }, [assetsById, filter, matches, search]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <Topbar />

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-12">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            Monitoring results
          </p>

          <h1 className="mt-2 font-heading text-[32px] font-semibold tracking-[-0.035em]">
            Matches
          </h1>

          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--text-muted)]">
            Review possible online matches found across supported sources.
          </p>
        </header>

        {actionError && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]"
          >
            {actionError}
          </p>
        )}

        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--surface-muted)] p-1">
            {filters.map((item) => {
              const selected = filter === item.value;
              const count = counts[item.value];

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  aria-pressed={selected}
                  className={[
                    "whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                    selected
                      ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {item.label}
                  <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <label className="relative block w-full lg:w-72">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--text-muted)]">
              search
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search artwork or source"
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)]"
            />
          </label>
        </section>

        {loading ? (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <p role="status" className="text-[13px] text-[var(--text-muted)]">
              Loading matches...
            </p>
          </section>
        ) : error ? (
          <section
            role="alert"
            className="rounded-xl bg-[var(--danger-soft)] p-5 text-[13px] text-[var(--danger)]"
          >
            {error}
          </section>
        ) : visibleMatches.length === 0 ? (
          <section className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <span className="material-symbols-outlined">search_off</span>
            </div>

            <h2 className="mt-4 text-[17px] font-semibold">
              No matches in this view
            </h2>

            <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[var(--text-muted)]">
              New possible matches will appear here after supported-source
              scans complete.
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex h-9 items-center rounded-lg bg-[var(--primary-strong)] px-4 text-[12px] font-semibold text-white"
            >
              View my artworks
            </Link>
          </section>
        ) : (
          <section className="space-y-4">
            {visibleMatches.map((match) => {
              const asset = assetsById.get(match.asset_id);
              const isUpdating = updatingMatchId === match.id;
              const actionsDisabled = updatingMatchId !== null;

              return (
                <article
                  key={match.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card sm:p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex flex-col items-center">
                          <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Your artwork
                          </span>

                          <div className="h-20 w-20 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                            {asset ? (
                              <img
                                src={asset.thumbnail_url}
                                alt={asset.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                                <span className="material-symbols-outlined">
                                  image
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="material-symbols-outlined text-[20px] text-[var(--text-muted)]">
                          compare_arrows
                        </span>

                        <div className="flex flex-col items-center">
                          <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Found online
                          </span>

                          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-center text-[10px] text-[var(--text-muted)]">
                            Preview unavailable
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-[17px] font-semibold">
                            {asset?.title ?? `Artwork #${match.asset_id}`}
                          </h2>

                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              signalClasses(match.overall_signal),
                            ].join(" ")}
                          >
                            {match.similarity_percent.toFixed(0)}% similarity
                          </span>

                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              statusClasses(match.review_status),
                            ].join(" ")}
                          >
                            {formatStatus(match.review_status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">
                              public
                            </span>
                            {match.source_name}
                          </span>

                          <span>Found {formatDate(match.found_at)}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[12px]">
                          <span
                            className={[
                              "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium",
                              match.watermark_matches_reference
                                ? "bg-[var(--success-soft)] text-[var(--success)]"
                                : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                            ].join(" ")}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {match.watermark_matches_reference
                                ? "verified"
                                : "help_outline"}
                            </span>
                            {match.watermark_matches_reference
                              ? "Watermark verified"
                              : "Watermark not verified"}
                          </span>

                          <span className="text-[var(--text-muted)]">
                            {formatSignal(match.overall_signal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-56 lg:justify-end">
                      {match.source_url && (
                        <a
                          href={match.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary-strong)] px-3 text-[12px] font-semibold text-white transition hover:brightness-110"
                        >
                          Open source
                          <span className="material-symbols-outlined text-[16px]">
                            open_in_new
                          </span>
                        </a>
                      )}

                      {match.review_status === "new" && (
                        <button
                          type="button"
                          disabled={actionsDisabled}
                          onClick={() =>
                            void updateMatchStatus(match.id, "reviewing")
                          }
                          className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-3 text-[12px] font-semibold disabled:opacity-50"
                        >
                          {isUpdating ? "Updating..." : "Review"}
                        </button>
                      )}

                      {match.review_status === "reviewing" && (
                        <button
                          type="button"
                          disabled={actionsDisabled}
                          onClick={() =>
                            void updateMatchStatus(match.id, "confirmed")
                          }
                          className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-3 text-[12px] font-semibold disabled:opacity-50"
                        >
                          {isUpdating ? "Updating..." : "Mark reviewed"}
                        </button>
                      )}

                      {(match.review_status === "dismissed" ||
                        match.review_status === "archived") && (
                        <button
                          type="button"
                          disabled={actionsDisabled}
                          onClick={() =>
                            void updateMatchStatus(match.id, "reviewing")
                          }
                          className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] px-3 text-[12px] font-semibold disabled:opacity-50"
                        >
                          {isUpdating ? "Updating..." : "Reopen"}
                        </button>
                      )}

                      {!["dismissed", "archived"].includes(
                        match.review_status,
                      ) && (
                        <button
                          type="button"
                          disabled={actionsDisabled}
                          onClick={() =>
                            void updateMatchStatus(match.id, "dismissed")
                          }
                          className="inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                        >
                          {isUpdating ? "Updating..." : "Ignore"}
                        </button>
                      )}

                      {match.review_status !== "archived" && (
                        <button
                          type="button"
                          disabled={actionsDisabled}
                          onClick={() =>
                            void updateMatchStatus(match.id, "archived")
                          }
                          className="inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                        >
                          {isUpdating ? "Updating..." : "Archive"}
                        </button>
                      )}

                      <span className="w-full text-right text-[11px] text-[var(--text-muted)]">
                        Match ID #{match.id}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <p className="mt-8 rounded-xl bg-[var(--surface-muted)] p-4 text-center text-[12px] leading-5 text-[var(--text-muted)]">
          These results are technical signals only. They do not automatically
          establish ownership, copyright infringement, or legal liability.
        </p>
      </main>
    </div>
  );
}

export default function MatchesPage() {
  return (
    <AuthGate>
      <MatchesContent />
    </AuthGate>
  );
}