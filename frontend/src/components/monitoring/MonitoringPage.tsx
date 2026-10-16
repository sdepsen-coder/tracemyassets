"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import { Card, Notice, PageTitle, PillLink } from "@/components/app/ui";
import { Icon } from "@/components/dashboard/Icon";
import {
  api,
  ApiError,
  type Asset,
  type AssetScan,
  type AssetStats,
  type CreditsInfo,
  type MatchRecord,
  type MatchSummary,
  type UsageInfo,
} from "@/lib/api";
import { countCards } from "@/lib/matchGroups";
import { formatShortDate, standardScansLeft } from "@/lib/monitoring";

import { ArtworkBox } from "./ArtworkBox";

type Tab = "active" | "archived";

function SummaryFact({ children, strong }: { children: string; strong?: string }) {
  return (
    <span className="whitespace-nowrap text-[14px] text-[var(--text-muted)]">
      {strong && <strong className="mr-1 text-[var(--text)]">{strong}</strong>}
      {children}
    </span>
  );
}

function EmptyState() {
  const steps = [
    {
      title: "Upload an artwork",
      text: "PNG, JPEG or WEBP, up to 25 MB. Your original stays private.",
    },
    {
      title: "Choose a scan",
      text: "We show what it costs before anything runs.",
    },
    {
      title: "Keep watching",
      text: "Automatic scans look for new copies every week or month.",
    },
  ];

  return (
    <Card className="mx-auto max-w-[720px] p-8 sm:p-12">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary-strong)]">
        <Icon name="shield" className="text-[30px]" />
      </span>
      <h2 className="mt-6 font-heading text-[30px] font-light tracking-[-0.02em]">
        Let&apos;s protect your first artwork
      </h2>
      <ol className="mt-6 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-bold",
                index === 0
                  ? "bg-[var(--primary-strong)] text-[var(--on-primary)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
              ].join(" ")}
            >
              {index + 1}
            </span>
            <span>
              <span className="block font-semibold">{step.title}</span>
              <span className="text-[14px] text-[var(--text-muted)]">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <PillLink href="/protect" icon="arrow_forward">
          Protect your first artwork
        </PillLink>
      </div>
      <p className="mt-6 flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
        <Icon name="lock" className="text-[16px]" />
        We never contact anyone on your behalf. Every next step is yours.
      </p>
    </Card>
  );
}

export function MonitoringPage() {
  const { user, logout } = useAuth();

  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [openMatches, setOpenMatches] = useState<MatchRecord[]>([]);
  const [error, setError] = useState("");

  const loadCounts = useCallback(async (signal?: AbortSignal) => {
    const [nextStats, nextSummary, newMatches, reviewing] = await Promise.all([
      api.assetStats(signal),
      api.getMatchSummary(signal),
      api.listMatches("new", 0, 100, signal),
      api.listMatches("reviewing", 0, 100, signal),
    ]);

    setStats(nextStats);
    setSummary(nextSummary);
    setOpenMatches([...newMatches, ...reviewing]);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    api.getUsage(controller.signal).then(setUsage).catch(() => {});
    api.getCredits(controller.signal).then(setCredits).catch(() => {});
    loadCounts(controller.signal).catch(() => {});

    return () => controller.abort();
  }, [loadCounts, user.id]);

  useEffect(() => {
    const controller = new AbortController();
    setAssets(null);
    setError("");

    api
      .listAssets(0, 100, tab, controller.signal)
      .then(setAssets)
      .catch(async (err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          await logout();
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Your artworks could not be loaded.",
        );
        setAssets([]);
      });

    return () => controller.abort();
  }, [tab, logout]);

  const copiesByAsset = useMemo(() => {
    const byAsset = new Map<number, MatchRecord[]>();

    for (const match of openMatches) {
      byAsset.set(match.asset_id, [...(byAsset.get(match.asset_id) ?? []), match]);
    }

    return new Map(
      [...byAsset].map(([assetId, matches]) => [assetId, countCards(matches)]),
    );
  }, [openMatches]);

  const visibleAssets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (assets ?? []).filter((asset) =>
      needle ? asset.title.toLowerCase().includes(needle) : true,
    );
  }, [assets, query]);

  function handleScanned(kind: "standard" | "deep", result: AssetScan) {
    if (kind === "standard") {
      setUsage((current) =>
        current && current.manual_scans.limit !== null
          ? {
              ...current,
              manual_scans: {
                ...current.manual_scans,
                used: current.manual_scans.used + 1,
                remaining: Math.max(0, (current.manual_scans.remaining ?? 0) - 1),
              },
            }
          : current,
      );
    }

    if (kind === "deep" && typeof result.credits_remaining === "number") {
      const balance = result.credits_remaining;
      setCredits((current) => (current ? { ...current, balance } : current));
    }

    void loadCounts().catch(() => {});
  }

  function handleRemoved(assetId: number) {
    setAssets((current) => current?.filter((asset) => asset.id !== assetId) ?? null);
    void loadCounts().catch(() => {});
  }

  const toReview = summary ? summary.new + summary.reviewing : 0;
  const scansLeft = standardScansLeft(usage);
  const noAssetsAtAll = stats !== null && stats.total === 0;

  return (
    <>
      <PageTitle
        title="Monitoring"
        subtitle="Your protected artworks, how often we scan them, and what we found."
        aside={
          stats && !noAssetsAtAll ? (
            <Card className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
              <SummaryFact strong={String(stats.active)}>
                {stats.active === 1 ? "artwork protected" : "artworks protected"}
              </SummaryFact>
              <SummaryFact strong={String(stats.monitored)}>on auto-scan</SummaryFact>
              {usage && (
                <SummaryFact
                  strong={scansLeft === null ? "Unlimited" : `${scansLeft} of ${usage.manual_scans.limit}`}
                >
                  {`monthly scans left · resets ${formatShortDate(usage.manual_scans.resets_on)}`}
                </SummaryFact>
              )}
              {credits && (
                <span className="whitespace-nowrap text-[14px] text-[var(--text-muted)]">
                  <strong className="mr-1 text-[var(--text)]">{credits.balance}</strong>
                  Deep scan {credits.balance === 1 ? "credit" : "credits"} ·{" "}
                  <Link href="/account" className="font-semibold text-[var(--primary-strong)] hover:underline">
                    Get more
                  </Link>
                </span>
              )}
            </Card>
          ) : undefined
        }
      />

      {noAssetsAtAll ? (
        <EmptyState />
      ) : (
        <>
          {toReview > 0 && (
            <div className="mb-8 flex flex-col gap-4 rounded-card bg-[var(--warning-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--warning)]">
                  <Icon name="warning" className="text-[22px]" />
                </span>
                <div>
                  <p className="font-semibold text-[var(--warning)]">
                    {toReview} possible {toReview === 1 ? "copy needs" : "copies need"} your review
                  </p>
                  <p className="text-[14px] text-[var(--text)]">
                    Look at each one and tell us whether it is your work.
                  </p>
                </div>
              </div>
              <PillLink href="/matches" icon="arrow_forward">
                Review now
              </PillLink>
            </div>
          )}

          <div className="mb-6 flex flex-col gap-3 border-b border-[var(--border)] sm:flex-row sm:items-end sm:justify-between">
            <div className="flex gap-6">
              {(["active", "archived"] as Tab[]).map((option) => {
                const count = stats ? (option === "active" ? stats.active : stats.archived) : null;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTab(option)}
                    aria-pressed={tab === option}
                    className={[
                      "-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-[15px] font-semibold capitalize transition",
                      tab === option
                        ? "border-[var(--primary-strong)] text-[var(--primary-strong)]"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]",
                    ].join(" ")}
                  >
                    {option}
                    {count !== null && (
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 text-[12px] text-[var(--text-muted)]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <label className="mb-3 flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 sm:w-64">
              <Icon name="search" className="text-[18px] text-[var(--text-muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search artworks"
                aria-label="Search artworks"
                className="w-full bg-transparent text-[14px] outline-none"
              />
            </label>
          </div>

          {error && <div className="mb-6"><Notice tone="error">{error}</Notice></div>}

          {assets === null ? (
            <p className="py-16 text-center text-[var(--text-muted)]">Loading your artworks…</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visibleAssets.map((asset) => (
                <ArtworkBox
                  key={asset.id}
                  asset={asset}
                  copiesToReview={copiesByAsset.get(asset.id) ?? 0}
                  usage={usage}
                  credits={credits}
                  onScanned={handleScanned}
                  onMonitoringChanged={() => void loadCounts().catch(() => {})}
                  onRemoved={handleRemoved}
                />
              ))}

              {tab === "active" && !query && (
                <Link
                  href="/protect"
                  className="flex min-h-[320px] flex-col items-center justify-center rounded-card border-2 border-dashed border-[var(--border)] p-6 text-center transition hover:border-[var(--primary-strong)] hover:bg-[var(--surface)]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)]">
                    <Icon name="add" className="text-[28px]" />
                  </span>
                  <span className="mt-4 font-heading text-[18px] font-normal">
                    Protect new artwork
                  </span>
                  <span className="mt-1 max-w-[260px] text-[14px] text-[var(--text-muted)]">
                    Upload an original, add an invisible watermark and start
                    looking for copies.
                  </span>
                </Link>
              )}

              {visibleAssets.length === 0 && (tab === "archived" || query) && (
                <p className="col-span-full py-16 text-center text-[var(--text-muted)]">
                  {query
                    ? "No artworks match your search."
                    : "Nothing archived. Artworks you're done with can be archived from their ⋯ menu."}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
