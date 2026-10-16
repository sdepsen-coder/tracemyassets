"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import { Card, Chip, Notice, PageTitle, Pill, PillLink } from "@/components/app/ui";
import { Icon } from "@/components/dashboard/Icon";
import { NextSteps } from "@/components/matches/NextSteps";
import {
  api,
  ApiError,
  type Asset,
  type MatchPageKind,
  type MatchRecord,
  type MatchRecordUpdate,
  type MatchVerdict,
} from "@/lib/api";
import { cardKey } from "@/lib/matchGroups";

type Tab = "review" | "confirmed" | "dismissed";
type Strength = "all" | "strong" | "watermark";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "review", label: "To review" },
  { id: "confirmed", label: "Confirmed" },
  { id: "dismissed", label: "Dismissed" },
];

const PAGE_KIND: Record<MatchPageKind, { label: string; hint: string; rank: number }> = {
  item: {
    label: "Item page",
    hint: "A single listing or pin. The image may be its main photo or sit elsewhere on the page.",
    rank: 0,
  },
  page: {
    label: "Web page",
    hint: "The image appears somewhere on this page, not necessarily as its main item.",
    rank: 1,
  },
  collection: {
    label: "Search or category page",
    hint: "A search, category, board or shop page. The image appears among many other items.",
    rank: 2,
  },
  image_only: {
    label: "Image only",
    hint: "The image was found, but not the page it is shown on.",
    rank: 3,
  },
};

// "Not a copy" asks one question; each answer maps to the verdict the
// feedback system already understands.
const NOT_A_COPY_REASONS: Array<{ verdict: MatchVerdict; label: string }> = [
  { verdict: "unrelated", label: "It has nothing to do with my artwork" },
  { verdict: "different", label: "It looks similar, but it's a different artwork" },
  { verdict: "irrelevant", label: "It's my work, but not worth acting on" },
];

function tabOf(status: MatchRecord["review_status"]): Tab {
  if (status === "confirmed") return "confirmed";
  if (status === "dismissed" || status === "archived") return "dismissed";
  return "review";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function strengthOf(match: MatchRecord): { label: string; tone: "success" | "warning" | "neutral" } {
  const percent = Math.round(match.similarity_percent);

  switch (match.overall_signal) {
    case "WATERMARK_VERIFIED":
    case "STRONG_VISUAL_MATCH":
      return { label: `Strong match · ${percent}%`, tone: "success" };
    case "POSSIBLE_VISUAL_MATCH":
      return { label: `Possible match · ${percent}%`, tone: "warning" };
    default:
      return { label: `Weak match · ${percent}%`, tone: "neutral" };
  }
}

function summaryOf(match: MatchRecord): { title: string; text: string } {
  if (match.watermark_matches_reference) {
    return {
      title: "Very likely your work",
      text: "The invisible watermark from your protected file was found in this image, so it was made from your copy.",
    };
  }

  if (match.overall_signal === "STRONG_VISUAL_MATCH") {
    return {
      title: "Looks like your work",
      text: `The picture matches yours closely (${Math.round(match.similarity_percent)}% similar). No watermark was found, which is normal for copies made from your original or a screenshot.`,
    };
  }

  return {
    title: "Might be your work",
    text: `There is some resemblance (${Math.round(match.similarity_percent)}% similar). Compare the two images carefully before deciding.`,
  };
}

function Thumb({ src, label, tone }: { src: string | null; label: string; tone?: "found" }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="flex h-full items-center justify-center text-[var(--text-muted)]">
          <Icon name={tone === "found" ? "language" : "image"} className="text-[28px]" />
        </span>
      )}
      <span
        className={[
          "absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          tone === "found" ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-black/60 text-white",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

function SourceLine({ match }: { match: MatchRecord }) {
  if (match.source_locked) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1 text-[13px] text-[var(--text-muted)]">
        <Icon name="lock" className="text-[15px]" />
        Website hidden on Free plan ·
        <Link href="/pricing" className="font-semibold text-[var(--primary-strong)] hover:underline">
          Upgrade to see it
        </Link>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-[var(--text-muted)]">
      <Icon name="public" className="text-[15px]" />
      {match.source_name || "Web page"} · {PAGE_KIND[match.page_kind ?? "page"].label.toLowerCase()}
    </span>
  );
}

export function MatchesPage() {
  const { logout } = useAuth();

  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState<Tab>("review");
  const [assetFilter, setAssetFilter] = useState<number | "all">("all");
  const [strength, setStrength] = useState<Strength>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [askingWhy, setAskingWhy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      api.listMatches(undefined, 0, 100, controller.signal),
      api.listAssets(0, 100, "all", controller.signal),
    ])
      .then(([matchResult, assetResult]) => {
        setMatches(matchResult);
        setAssets(assetResult);
      })
      .catch(async (err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          await logout();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Matches could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [logout]);

  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  // One card per picture (see lib/matchGroups.ts): the best page leads the
  // card and the same image on other pages is listed inside it.
  const cards = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) => PAGE_KIND[a.page_kind ?? "page"].rank - PAGE_KIND[b.page_kind ?? "page"].rank,
    );
    const result: Array<{ lead: MatchRecord; others: MatchRecord[] }> = [];
    const byKey = new Map<string, { lead: MatchRecord; others: MatchRecord[] }>();

    for (const match of sorted) {
      const key = cardKey(match);
      const existing = byKey.get(key);

      if (existing) {
        existing.others.push(match);
      } else {
        const card = { lead: match, others: [] };
        byKey.set(key, card);
        result.push(card);
      }
    }

    return result;
  }, [matches]);

  const counts = useMemo(() => {
    const totals: Record<Tab, number> = { review: 0, confirmed: 0, dismissed: 0 };
    for (const card of cards) totals[tabOf(card.lead.review_status)] += 1;
    return totals;
  }, [cards]);

  const visible = cards.filter(({ lead }) => {
    if (tabOf(lead.review_status) !== tab) return false;
    if (assetFilter !== "all" && lead.asset_id !== assetFilter) return false;
    if (strength === "watermark" && !lead.watermark_matches_reference) return false;
    if (
      strength === "strong" &&
      lead.overall_signal !== "WATERMARK_VERIFIED" &&
      lead.overall_signal !== "STRONG_VISUAL_MATCH"
    ) {
      return false;
    }
    return true;
  });

  const open = cards.find((card) => card.lead.id === openId) ?? null;
  const openAsset = open ? assetsById.get(open.lead.asset_id) : undefined;
  const assetsWithMatches = assets.filter((asset) =>
    cards.some((card) => card.lead.asset_id === asset.id),
  );

  async function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.status === 401) {
      await logout();
      return;
    }
    setActionError(err instanceof ApiError ? err.message : fallback);
  }

  async function setStatus(
    card: { lead: MatchRecord; others: MatchRecord[] },
    reviewStatus: MatchRecordUpdate["review_status"],
  ) {
    const ids = [card.lead.id, ...card.others.map((other) => other.id)];
    const updated = await Promise.all(
      ids.map((id) => api.updateMatch(id, { review_status: reviewStatus })),
    );
    const byId = new Map(updated.map((match) => [match.id, match]));
    setMatches((current) => current.map((match) => byId.get(match.id) ?? match));
  }

  async function openCard(card: { lead: MatchRecord; others: MatchRecord[] }) {
    setOpenId(card.lead.id);
    setAskingWhy(false);
    setConfirmDelete(false);
    setActionError("");

    window.requestAnimationFrame(() => {
      if (window.innerWidth < 1024) {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    // Opening a new match means the user is looking at it now.
    if (card.lead.review_status === "new") {
      try {
        await setStatus(card, "reviewing");
      } catch {
        // Not critical: the card simply stays "new".
      }
    }
  }

  async function decide(verdict: MatchVerdict, reviewStatus: "confirmed" | "dismissed") {
    if (!open || busy) return;

    setBusy(true);
    setActionError("");

    try {
      await setStatus(open, reviewStatus);
      await api.setMatchFeedback(open.lead.id, verdict);
      setMatches((current) =>
        current.map((match) =>
          match.id === open.lead.id ? { ...match, feedback_verdict: verdict } : match,
        ),
      );
      setAskingWhy(false);
      setOpenId(null);
    } catch (err) {
      await fail(err, "Your decision could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function moveBackToReview() {
    if (!open || busy) return;

    setBusy(true);
    setActionError("");

    try {
      await setStatus(open, "reviewing");
      setOpenId(null);
      setTab("review");
    } catch (err) {
      await fail(err, "This match could not be moved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!open || busy) return;

    const ids = [open.lead.id, ...open.others.map((other) => other.id)];
    setBusy(true);
    setActionError("");

    try {
      await api.deleteMatches(ids);
      const gone = new Set(ids);
      setMatches((current) => current.filter((match) => !gone.has(match.id)));
      setOpenId(null);
    } catch (err) {
      await fail(err, "This match could not be deleted.");
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Matches"
        subtitle="Possible copies of your work. Look at each one and tell us what it is."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit gap-1 rounded-full bg-[var(--surface-muted)] p-1">
          {TABS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={tab === option.id}
              onClick={() => {
                setTab(option.id);
                setOpenId(null);
              }}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold transition",
                tab === option.id
                  ? "bg-[var(--surface)] text-[var(--primary-strong)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              {option.label}
              <span className="text-[12px] font-bold opacity-70">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={assetFilter}
            onChange={(event) =>
              setAssetFilter(event.target.value === "all" ? "all" : Number(event.target.value))
            }
            aria-label="Filter by artwork"
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px]"
          >
            <option value="all">All artworks</option>
            {assetsWithMatches.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.title}
              </option>
            ))}
          </select>
          <select
            value={strength}
            onChange={(event) => setStrength(event.target.value as Strength)}
            aria-label="Filter by strength"
            className="h-10 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px]"
          >
            <option value="all">All strengths</option>
            <option value="strong">Strong and above</option>
            <option value="watermark">Watermark found</option>
          </select>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {loading ? (
        <p className="py-16 text-center text-[var(--text-muted)]">Loading matches…</p>
      ) : visible.length === 0 ? (
        <Card className="mx-auto max-w-[560px] p-10 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
            <Icon name="task_alt" className="text-[34px]" />
          </span>
          <h2 className="mt-5 font-heading text-[22px] font-semibold">
            {tab === "review" ? "Nothing to review" : "Nothing here yet"}
          </h2>
          <p className="mt-2 text-[15px] text-[var(--text-muted)]">
            {tab === "review"
              ? "When a scan finds a possible copy, it shows up here."
              : "Matches you decide on move here."}
          </p>
          <div className="mt-6">
            <PillLink href="/" variant="secondary">Go to Monitoring</PillLink>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <ul className="flex flex-col gap-4">
            {visible.map((card) => {
              const { lead, others } = card;
              const asset = assetsById.get(lead.asset_id);
              const strengthInfo = strengthOf(lead);
              const isOpen = lead.id === openId;
              const deep = lead.found_by_deep_scan || others.some((other) => other.found_by_deep_scan);

              return (
                <li key={lead.id}>
                  <article
                    className={[
                      "rounded-card border bg-[var(--surface)] p-4 transition sm:p-5",
                      isOpen
                        ? "border-[var(--primary-strong)] shadow-floating"
                        : "border-[var(--border)]",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-24 shrink-0 sm:w-28">
                        <Thumb src={asset?.thumbnail_url ?? null} label="Yours" />
                      </div>
                      <Icon name="arrow_forward" className="text-[20px] text-[var(--text-muted)]" />
                      <div className="w-24 shrink-0 sm:w-28">
                        <Thumb src={lead.candidate_image_url} label="Found" tone="found" />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <h2 className="mr-1 font-heading text-[18px] font-semibold">
                        {asset?.title ?? "Artwork"}
                      </h2>
                      <Chip tone={strengthInfo.tone}>{strengthInfo.label}</Chip>
                      {lead.watermark_matches_reference && (
                        <Chip tone="success" icon="verified_user">Watermark found</Chip>
                      )}
                      {deep && <Chip tone="info">Deep scan</Chip>}
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      <SourceLine match={lead} />
                      <span className="inline-flex items-center gap-1 text-[13px] text-[var(--text-muted)]">
                        <Icon name="schedule" className="text-[15px]" />
                        Found {formatDate(lead.found_at)}
                        {others.length > 0 &&
                          ` · also on ${others.length} other ${others.length === 1 ? "page" : "pages"}`}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[var(--primary-strong)]">
                        {lead.review_status === "reviewing" && "• Looking at it"}
                        {lead.review_status === "new" && "• New"}
                      </span>
                      <Pill size="sm" onClick={() => void openCard(card)}>
                        Open
                        <Icon name="chevron_right" className="text-[18px]" />
                      </Pill>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          <div ref={panelRef} className="scroll-mt-24">
            {open ? (
              <Card className="lg:sticky lg:top-24">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-[18px] font-semibold">
                      {openAsset?.title ?? "Artwork"} — possible copy
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(null)}
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                  >
                    <Icon name="close" className="text-[20px]" />
                  </button>
                </div>

                <div className="space-y-6 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1.5 text-[12px] font-semibold text-[var(--text-muted)]">Your artwork</p>
                      <Thumb src={openAsset?.thumbnail_url ?? null} label="Yours" />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[12px] font-semibold text-[var(--danger)]">Found online</p>
                      <Thumb src={open.lead.candidate_image_url} label="Found" tone="found" />
                    </div>
                  </div>

                  <div className="flex gap-3 rounded-card bg-[var(--primary-soft)] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-strong)] text-white">
                      <Icon name={open.lead.watermark_matches_reference ? "verified_user" : "image_search"} className="text-[20px]" />
                    </span>
                    <div>
                      <p className="font-semibold text-[var(--primary-strong)]">{summaryOf(open.lead).title}</p>
                      <p className="mt-1 text-[14px] text-[var(--text)]">{summaryOf(open.lead).text}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[14px] font-semibold">Where it was found</p>
                    <div className="rounded-card border border-[var(--border)] p-4">
                      {open.lead.source_locked ? (
                        <p className="text-[14px] text-[var(--text-muted)]">
                          The website is hidden on the Free plan.{" "}
                          <Link href="/pricing" className="font-semibold text-[var(--primary-strong)] hover:underline">
                            Upgrade to see exactly where it is
                          </Link>
                          .
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold">
                              {open.lead.source_name || "Web page"}
                            </p>
                            <p className="text-[13px] text-[var(--text-muted)]">
                              {PAGE_KIND[open.lead.page_kind ?? "page"].hint}
                            </p>
                          </div>
                          {open.lead.source_url && (
                            <a
                              href={open.lead.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--primary-strong)] hover:underline"
                            >
                              Open page
                              <Icon name="open_in_new" className="text-[16px]" />
                            </a>
                          )}
                        </div>
                      )}

                      {open.others.length > 0 && (
                        <details className="mt-3 text-[13px] text-[var(--text-muted)]">
                          <summary className="cursor-pointer font-semibold text-[var(--text)]">
                            Also on {open.others.length} other {open.others.length === 1 ? "page" : "pages"}
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {open.others.map((other) => (
                              <li key={other.id}>
                                {other.source_locked ? (
                                  "Website hidden on your plan"
                                ) : other.source_url ? (
                                  <a
                                    href={other.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-[var(--primary-strong)] underline"
                                  >
                                    {other.source_name ?? other.source_url}
                                  </a>
                                ) : (
                                  PAGE_KIND[other.page_kind ?? "page"].label
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[14px] font-semibold">What the checks say</p>
                    <ul className="space-y-2 text-[14px]">
                      <li className="flex items-center gap-2">
                        <Icon name="check_circle" className="text-[18px] text-[var(--success)]" />
                        Overall look: {Math.round(open.lead.similarity_percent)}% similar to your artwork
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon
                          name={open.lead.watermark_matches_reference ? "check_circle" : "remove_circle_outline"}
                          className={`text-[18px] ${open.lead.watermark_matches_reference ? "text-[var(--success)]" : "text-[var(--text-muted)]"}`}
                        />
                        {open.lead.watermark_matches_reference
                          ? "Your invisible watermark was found"
                          : "No watermark found (normal if it was copied from your original)"}
                      </li>
                    </ul>
                  </div>

                  <NextSteps match={open.lead} artworkTitle={openAsset?.title ?? "my artwork"} />

                  {actionError && <Notice tone="error">{actionError}</Notice>}
                </div>

                <div className="sticky bottom-0 rounded-b-card border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4">
                  {confirmDelete ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[14px]">
                        Remove this match from your list? A later scan may find it again.
                      </p>
                      <div className="flex gap-2">
                        <Pill size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
                          Cancel
                        </Pill>
                        <Pill size="sm" variant="danger" disabled={busy} onClick={() => void remove()}>
                          Delete
                        </Pill>
                      </div>
                    </div>
                  ) : tabOf(open.lead.review_status) !== "review" ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[14px] text-[var(--text-muted)]">
                        {open.lead.review_status === "confirmed"
                          ? "You marked this as your work."
                          : "You marked this as not a copy."}
                      </span>
                      <div className="flex gap-2">
                        <Pill size="sm" variant="quiet" icon="delete" onClick={() => setConfirmDelete(true)}>
                          Delete
                        </Pill>
                        <Pill size="sm" variant="secondary" disabled={busy} onClick={() => void moveBackToReview()}>
                          Move back to review
                        </Pill>
                      </div>
                    </div>
                  ) : askingWhy ? (
                    <div>
                      <p className="mb-3 text-[14px] font-semibold">Why isn&apos;t it a copy?</p>
                      <div className="flex flex-col gap-2">
                        {NOT_A_COPY_REASONS.map((reason) => (
                          <button
                            key={reason.verdict}
                            type="button"
                            disabled={busy}
                            onClick={() => void decide(reason.verdict, "dismissed")}
                            className="rounded-xl border border-[var(--border)] px-4 py-3 text-left text-[14px] transition hover:border-[var(--primary-strong)] hover:bg-[var(--primary-soft)] disabled:opacity-50"
                          >
                            {reason.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAskingWhy(false)}
                        className="mt-3 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        ← Back
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="text-left text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--danger)]"
                      >
                        Delete
                      </button>
                      <div className="flex gap-2">
                        <Pill variant="secondary" disabled={busy} onClick={() => setAskingWhy(true)}>
                          Not a copy
                        </Pill>
                        <Pill icon="check" disabled={busy} onClick={() => void decide("useful", "confirmed")}>
                          Yes, this is my work
                        </Pill>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="hidden h-full min-h-[320px] flex-col items-center justify-center p-10 text-center lg:flex">
                <Icon name="compare" className="text-[40px] text-[var(--text-muted)]" />
                <p className="mt-3 font-heading text-[18px] font-semibold">Open a match to compare</p>
                <p className="mt-1 max-w-[320px] text-[14px] text-[var(--text-muted)]">
                  You&apos;ll see both images side by side, where it was found, and what you can do.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-[13px] text-[var(--text-muted)]">
        Matches are technical signals, not legal proof. We never contact anyone for you.
      </p>
    </>
  );
}
