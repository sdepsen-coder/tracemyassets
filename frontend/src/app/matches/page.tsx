"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthGate, useAuth } from "@/components/AuthGate";
import { Topbar } from "@/components/dashboard/Topbar";
import { SiteFooter } from "@/components/SiteFooter";
import {
  api,
  ApiError,
  type Asset,
  type MatchRecord,
  type MatchRecordUpdate,
  type MatchVerdict,
} from "@/lib/api";

type MatchFilter =
  | "all"
  | "needs_review"
  | "confirmed"
  | "dismissed"
  | "archived";

type StrengthFilter = "all" | "strong" | "watermark";

const strengthOptions: Array<{
  value: StrengthFilter;
  label: string;
}> = [
  { value: "all", label: "All strengths" },
  { value: "strong", label: "Strong matches and better" },
  { value: "watermark", label: "Watermark verified only" },
];

const SHOW_STRENGTH_KEY = "tma_show_match_strength";

const verdictOptions: Array<{
  value: MatchVerdict;
  label: string;
  hint: string;
}> = [
  {
    value: "useful",
    label: "Useful",
    hint: "A real copy I am glad to know about",
  },
  {
    value: "false_positive",
    label: "False positive",
    hint: "This is not a copy of my artwork",
  },
  {
    value: "not_my_work",
    label: "Not my work",
    hint: "The artwork shown is not mine",
  },
];

const filters: Array<{
  value: MatchFilter;
  label: string;
}> = [
  { value: "all", label: "All matches" },
  { value: "needs_review", label: "Needs review" },
  { value: "confirmed", label: "Confirmed" },
  { value: "dismissed", label: "Ignored" },
  { value: "archived", label: "Archived" },
];

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
      return "Confirmed";
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

function statusClasses(
  status: MatchRecord["review_status"],
): string {
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

function signalClasses(
  signal: MatchRecord["overall_signal"],
): string {
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
  const [strength, setStrength] = useState<StrengthFilter>("all");
  const [showStrength, setShowStrength] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [matchResult, assetResult] = await Promise.all([
          api.listMatches(undefined, 0, 100, controller.signal),
          api.listAssets(0, 100, "all", controller.signal),
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

  async function handleStatusChange(
    matchId: number,
    reviewStatus: MatchRecordUpdate["review_status"],
  ) {
    setUpdatingId(matchId);
    setActionError("");

    try {
      const updated = await api.updateMatch(matchId, {
        review_status: reviewStatus,
      });

      setMatches((current) =>
        current.map((match) => (match.id === matchId ? updated : match)),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        await logout();
        return;
      }

      setActionError(
        err instanceof ApiError
          ? err.message
          : "This match could not be updated.",
      );
    } finally {
      setUpdatingId((current) => (current === matchId ? null : current));
    }
  }

  async function handleVerdict(matchId: number, verdict: MatchVerdict) {
    const previous =
      matches.find((match) => match.id === matchId)?.feedback_verdict ??
      null;

    // Pressing the chosen verdict again takes it back.
    const next = previous === verdict ? null : verdict;

    function show(value: MatchVerdict | null) {
      setMatches((current) =>
        current.map((match) =>
          match.id === matchId
            ? { ...match, feedback_verdict: value }
            : match,
        ),
      );
    }

    setActionError("");
    show(next);

    try {
      if (next === null) {
        await api.clearMatchFeedback(matchId);
      } else {
        await api.setMatchFeedback(matchId, next);
      }
    } catch (err) {
      show(previous);

      if (err instanceof ApiError && err.status === 401) {
        await logout();
        return;
      }

      setActionError(
        err instanceof ApiError
          ? err.message
          : "Your feedback could not be saved.",
      );
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

  useEffect(() => {
    try {
      setShowStrength(localStorage.getItem(SHOW_STRENGTH_KEY) === "1");
    } catch {
      // Storage can be unavailable (private mode); the default is fine.
    }
  }, []);

  function handleShowStrengthChange(next: boolean) {
    setShowStrength(next);

    try {
      localStorage.setItem(SHOW_STRENGTH_KEY, next ? "1" : "0");
    } catch {
      // Not persisting the preference is harmless.
    }
  }

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

      if (
        strength === "watermark" &&
        match.overall_signal !== "WATERMARK_VERIFIED"
      ) {
        return false;
      }

      if (
        strength === "strong" &&
        match.overall_signal !== "WATERMARK_VERIFIED" &&
        match.overall_signal !== "STRONG_VISUAL_MATCH"
      ) {
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
  }, [assetsById, filter, matches, search, strength]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
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
                  className={[
                    "whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-semibold transition",
                    selected
                      ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {item.label}
                  <span className="ml-1 opacity-70">
                    {count}
                  </span>
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

        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-[var(--text-muted)]">
          <label className="flex items-center gap-2">
            <span>Show</span>
            <select
              aria-label="Filter matches by strength"
              value={strength}
              onChange={(event) =>
                setStrength(event.target.value as StrengthFilter)
              }
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[13px] text-[var(--text)]"
            >
              {strengthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showStrength}
              onChange={(event) =>
                handleShowStrengthChange(event.target.checked)
              }
              className="h-4 w-4 accent-[var(--primary-strong)]"
            />
            <span>Show match strength on cards</span>
          </label>
        </div>

        {actionError ? (
          <section
            role="alert"
            className="mb-6 rounded-xl bg-[var(--danger-soft)] p-4 text-[13px] text-[var(--danger)]"
          >
            {actionError}
          </section>
        ) : null}

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
              <span className="material-symbols-outlined">
                search_off
              </span>
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

                          <div className="h-20 w-20 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                            {match.candidate_image_url ? (
                              <img
                                src={match.candidate_image_url}
                                alt="Candidate found online"
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                                <span className="material-symbols-outlined">
                                  language
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-[17px] font-semibold">
                            {asset?.title ?? `Artwork #${match.asset_id}`}
                          </h2>

                          {showStrength ? (
                            <span
                              className={[
                                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                signalClasses(match.overall_signal),
                              ].join(" ")}
                            >
                              {match.similarity_percent.toFixed(0)}% similarity
                            </span>
                          ) : null}

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
                              {match.source_locked ? "lock" : "public"}
                            </span>
                            {match.source_locked
                              ? "Source hidden on your plan"
                              : match.source_name}
                          </span>

                          <span>
                            Found {formatDate(match.found_at)}
                          </span>
                        </div>

                        {match.watermark_matches_reference || showStrength ? (
                          <div className="flex flex-wrap items-center gap-3 text-[12px]">
                            {match.watermark_matches_reference ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--success-soft)] px-2 py-1 font-medium text-[var(--success)]">
                                <span className="material-symbols-outlined text-[14px]">
                                  verified
                                </span>
                                Watermark verified
                              </span>
                            ) : null}

                            {showStrength && !match.watermark_matches_reference ? (
                              <span className="text-[var(--text-muted)]">
                                {formatSignal(match.overall_signal)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                      {match.source_locked ? (
                        <span
                          title="Upgrade to Pro to see exactly where this was found"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[12px] font-semibold text-[var(--text-muted)]"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            lock
                          </span>
                          Upgrade to view source
                        </span>
                      ) : match.source_url ? (
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
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {match.review_status === "new" ? (
                          <button
                            type="button"
                            disabled={updatingId === match.id}
                            onClick={() =>
                              handleStatusChange(match.id, "reviewing")
                            }
                            className="inline-flex h-9 items-center rounded-lg bg-[var(--primary-soft)] px-3 text-[12px] font-semibold text-[var(--primary)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Review
                          </button>
                        ) : null}

                        {match.review_status === "reviewing" ? (
                          <button
                            type="button"
                            disabled={updatingId === match.id}
                            onClick={() =>
                              handleStatusChange(match.id, "confirmed")
                            }
                            className="inline-flex h-9 items-center rounded-lg bg-[var(--primary-soft)] px-3 text-[12px] font-semibold text-[var(--primary)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Mark reviewed
                          </button>
                        ) : null}

                        {match.review_status === "new" ||
                        match.review_status === "reviewing" ? (
                          <button
                            type="button"
                            disabled={updatingId === match.id}
                            onClick={() =>
                              handleStatusChange(match.id, "dismissed")
                            }
                            className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Ignore
                          </button>
                        ) : null}

                        {match.review_status !== "archived" ? (
                          <button
                            type="button"
                            disabled={updatingId === match.id}
                            onClick={() =>
                              handleStatusChange(match.id, "archived")
                            }
                            className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Archive
                          </button>
                        ) : null}
                      </div>

                      <span className="text-[11px] text-[var(--text-muted)]">
                        Match ID #{match.id}
                      </span>
                    </div>
                  </div>

                  <div
                    role="group"
                    aria-label="Was this result right?"
                    className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3"
                  >
                    <span className="mr-1 text-[12px] text-[var(--text-muted)]">
                      Was this result right?
                    </span>

                    {verdictOptions.map((option) => {
                      const selected =
                        match.feedback_verdict === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          title={option.hint}
                          aria-pressed={selected}
                          onClick={() =>
                            void handleVerdict(match.id, option.value)
                          }
                          className={[
                            "inline-flex h-8 items-center rounded-lg border px-3 text-[12px] font-semibold transition",
                            selected
                              ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]",
                          ].join(" ")}
                        >
                          {option.label}
                        </button>
                      );
                    })}
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

      <div className="mt-auto">
        <SiteFooter />
      </div>
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