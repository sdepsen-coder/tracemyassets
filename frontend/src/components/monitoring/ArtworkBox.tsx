"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import { Chip, CostLine, Pill } from "@/components/app/ui";
import { Icon } from "@/components/dashboard/Icon";
import {
  api,
  ApiError,
  type Asset,
  type AssetScan,
  type CreditsInfo,
  type MonitoringPreference,
  type UsageInfo,
} from "@/lib/api";
import { countCards } from "@/lib/matchGroups";
import {
  allowsDaily,
  deepScanCost,
  DEFAULT_THRESHOLD,
  FREQUENCY_LABEL,
  formatShortDate,
  nextScanLabel,
  standardScanCost,
  standardScansLeft,
  timeAgo,
  type Frequency,
} from "@/lib/monitoring";

const QUIET_DAYS = 90;

type Props = {
  asset: Asset;
  copiesToReview: number;
  usage: UsageInfo | null;
  credits: CreditsInfo | null;
  /** Lets the page refresh counts after a scan, archive or delete. */
  onScanned: (kind: "standard" | "deep", result: AssetScan) => void;
  onMonitoringChanged: () => void;
  onRemoved: (assetId: number) => void;
};

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
  disabled,
}: {
  icon: string;
  children: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "text-[var(--danger)]" : "text-[var(--text)]",
      ].join(" ")}
    >
      <Icon name={icon} className="text-[18px]" />
      {children}
    </button>
  );
}

export function ArtworkBox({
  asset,
  copiesToReview,
  usage,
  credits,
  onScanned,
  onMonitoringChanged,
  onRemoved,
}: Props) {
  const { user, logout } = useAuth();
  const archived = asset.status === "archived";

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [preference, setPreference] = useState<MonitoringPreference | null>(null);
  const [scanning, setScanning] = useState<"standard" | "deep" | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    api
      .thumbnail(asset.id, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setThumbnail(objectUrl);
      })
      .catch(() => {});

    if (!archived) {
      api
        .getMonitoring(asset.id, controller.signal)
        .then(setPreference)
        .catch(() => {});
    }

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id, archived]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.status === 401) {
      await logout();
      return;
    }

    setError(err instanceof ApiError ? err.message : fallback);
  }

  async function saveMonitoring(enabled: boolean, frequency: Frequency) {
    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      setPreference(
        await api.updateMonitoring(asset.id, {
          enabled,
          scan_frequency: frequency,
          alert_threshold_percent:
            preference?.alert_threshold_percent ?? DEFAULT_THRESHOLD,
        }),
      );
      onMonitoringChanged();
    } catch (err) {
      await fail(err, "The automatic scan setting could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function scan(kind: "standard" | "deep") {
    if (scanning) return;

    setMenuOpen(false);
    setScanning(kind);
    setError("");
    setMessage("");

    try {
      const result =
        kind === "deep"
          ? await api.runDeepScan(asset.id)
          : await api.runScan(asset.id);

      onScanned(kind, result);
      setPreference((current) =>
        current
          ? { ...current, last_scan_at: result.scan_job.completed_at ?? current.last_scan_at }
          : current,
      );

      if (kind === "deep" && result.credit_refunded) {
        setMessage("The Deep scan couldn't run just now, so your credit was returned.");
      } else {
        const found = countCards(result.matches);
        setMessage(
          found === 0
            ? "Scan finished · no copies found."
            : `Scan finished · ${found} possible ${found === 1 ? "copy" : "copies"} found.`,
        );
      }
    } catch (err) {
      await fail(err, "The scan could not be completed.");
    } finally {
      setScanning(null);
    }
  }

  async function download(kind: "original" | "protected") {
    setMenuOpen(false);

    try {
      const blob =
        kind === "protected"
          ? await api.downloadWatermarked(asset.id)
          : await api.downloadOriginal(asset.id);
      saveBlob(blob, `${asset.title}${kind === "protected" ? "-protected.png" : ""}`);
    } catch (err) {
      await fail(err, "The file could not be downloaded.");
    }
  }

  async function setArchived(next: boolean) {
    setMenuOpen(false);

    try {
      await api.archiveAsset(asset.id, next);
      onRemoved(asset.id);
    } catch (err) {
      await fail(err, next ? "The artwork could not be archived." : "The artwork could not be restored.");
    }
  }

  async function remove() {
    try {
      await api.deleteAsset(asset.id);
      onRemoved(asset.id);
    } catch (err) {
      setConfirmDelete(false);
      await fail(err, "The artwork could not be deleted.");
    }
  }

  const enabled = preference?.enabled ?? false;
  const frequency = preference?.scan_frequency ?? "weekly";
  const standardLeft = standardScansLeft(usage);
  const canStandardScan = standardLeft === null || standardLeft > 0;
  const canDeepScan = credits !== null && credits.balance >= credits.deep_scan_cost;

  const ageDays = (Date.now() - new Date(asset.created_at).getTime()) / 86_400_000;
  const suggestArchive =
    !archived &&
    enabled &&
    copiesToReview === 0 &&
    Boolean(preference?.last_scan_at) &&
    ageDays > QUIET_DAYS;

  let statusChip;
  if (archived) {
    statusChip = <Chip icon="inventory_2">Archived</Chip>;
  } else if (scanning) {
    statusChip = <Chip tone="info" icon="progress_activity">Scanning…</Chip>;
  } else if (enabled) {
    statusChip = (
      <Chip tone="success" icon="autorenew">
        Auto-scan {FREQUENCY_LABEL[frequency].toLowerCase()}
      </Chip>
    );
  } else {
    statusChip = <Chip icon="pause">Auto-scan off</Chip>;
  }

  return (
    <article className="relative flex flex-col rounded-card border border-[var(--border)] bg-[var(--surface)] p-4">
        <div ref={menuRef} className="absolute right-7 top-7 z-20">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={`More actions for ${asset.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow"
          >
            <Icon name="more_horiz" className="text-[20px]" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-10 z-30 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-floating"
            >
              {!archived && enabled && (
                <>
                  <p className="px-3 pb-1 pt-2 text-[12px] font-semibold text-[var(--text-muted)]">
                    How often
                  </p>
                  <div className="flex gap-1 px-2 pb-2">
                    {(["daily", "weekly", "monthly"] as Frequency[]).map((option) => {
                      const locked = option === "daily" && !allowsDaily(user.plan_type);

                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={locked || saving}
                          title={locked ? "Daily scans come with Pro and Extra" : undefined}
                          onClick={() => {
                            setMenuOpen(false);
                            void saveMonitoring(true, option);
                          }}
                          className={[
                            "flex-1 rounded-full px-2 py-1.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-40",
                            frequency === option
                              ? "bg-[var(--primary-strong)] text-white"
                              : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                          ].join(" ")}
                        >
                          {FREQUENCY_LABEL[option]}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {!archived && (
                <MenuItem
                  icon="radar"
                  disabled={!canDeepScan || Boolean(scanning)}
                  onClick={() => void scan("deep")}
                >
                  {`Deep scan · ${credits?.deep_scan_cost ?? 1} credit`}
                </MenuItem>
              )}
              {asset.watermarked_url && (
                <MenuItem icon="download" onClick={() => void download("protected")}>
                  Download protected copy
                </MenuItem>
              )}
              <MenuItem icon="download" onClick={() => void download("original")}>
                Download original
              </MenuItem>
              {archived ? (
                <MenuItem icon="unarchive" onClick={() => void setArchived(false)}>
                  Restore to Active
                </MenuItem>
              ) : (
                <MenuItem icon="inventory_2" onClick={() => void setArchived(true)}>
                  Archive
                </MenuItem>
              )}
              <MenuItem
                icon="delete"
                danger
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                Delete…
              </MenuItem>
            </div>
          )}
        </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--surface-muted)]">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            className={`h-full w-full object-cover ${archived ? "grayscale" : ""}`}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[var(--text-muted)]">
            <Icon name="image" className="text-[32px]" />
          </span>
        )}

        <span className="absolute left-3 top-3">{statusChip}</span>

        {!archived && preference && enabled && !scanning && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-[12px] font-semibold text-white">
            <Icon name="event" className="text-[15px]" />
            {nextScanLabel(preference)}
          </span>
        )}

        {scanning && (
          <span className="absolute inset-x-3 bottom-3 overflow-hidden rounded-lg bg-white/90 px-3 py-2 text-[12px] font-semibold text-[var(--primary-strong)]">
            {scanning === "deep" ? "Deep scan running…" : "Looking for copies…"}
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[var(--primary-soft)]">
              <span className="block h-full w-1/3 animate-pulse rounded-full bg-[var(--primary-strong)]" />
            </span>
          </span>
        )}

      </div>

      <div className="mt-4 flex items-start justify-between gap-2">
        <h2 className="truncate font-heading text-[18px] font-semibold" title={asset.title}>
          {asset.title}
        </h2>
        {copiesToReview > 0 && (
          <Chip tone="warning">
            {copiesToReview} {copiesToReview === 1 ? "copy" : "copies"}
          </Chip>
        )}
      </div>
      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
        {asset.watermarked_url ? "Protected" : "Fingerprinted"} · added{" "}
        {formatShortDate(asset.created_at)}
      </p>

      <div
        className={[
          "mt-4 flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-[13px]",
          copiesToReview > 0
            ? "bg-[var(--warning-soft)]"
            : "bg-[var(--surface-muted)]",
        ].join(" ")}
      >
        <span className="flex items-center gap-2 text-[var(--text)]">
          <Icon
            name={copiesToReview > 0 ? "warning" : "history"}
            className={`text-[17px] ${copiesToReview > 0 ? "text-[var(--warning)]" : "text-[var(--text-muted)]"}`}
          />
          {preference?.last_scan_at
            ? `Last scan ${timeAgo(preference.last_scan_at)}`
            : archived
              ? "Not scanned while archived"
              : "Not scanned yet"}
        </span>
        {copiesToReview > 0 ? (
          <Link
            href="/matches"
            className="font-semibold text-[var(--primary-strong)] hover:underline"
          >
            Review →
          </Link>
        ) : suggestArchive ? (
          <button
            type="button"
            onClick={() => void setArchived(true)}
            className="font-semibold text-[var(--primary-strong)] hover:underline"
            title={`Nothing new in ${QUIET_DAYS / 30} months`}
          >
            Archive it?
          </button>
        ) : (
          preference?.last_scan_at && (
            <span className="text-[var(--text-muted)]">No new copies</span>
          )
        )}
      </div>

      {message && (
        <p role="status" className="mt-3 text-[13px] text-[var(--success)]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-[var(--danger)]">
          {error}
        </p>
      )}

      {confirmDelete ? (
        <div className="mt-4 rounded-xl border border-[var(--danger)] p-3">
          <p className="text-[13px] text-[var(--text)]">
            Delete <strong>{asset.title}</strong>, its files, scans and matches?
            This cannot be undone.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Pill size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Pill>
            <Pill size="sm" variant="danger" onClick={() => void remove()}>
              Delete
            </Pill>
          </div>
        </div>
      ) : archived ? (
        <div className="mt-auto flex justify-end pt-4">
          <Pill size="sm" variant="secondary" icon="unarchive" onClick={() => void setArchived(false)}>
            Restore
          </Pill>
        </div>
      ) : (
        <div className="mt-auto border-t border-[var(--border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Pill
              size="sm"
              variant={enabled ? "quiet" : "secondary"}
              icon={enabled ? "pause_circle" : "play_circle"}
              disabled={saving || !preference || Boolean(scanning)}
              onClick={() => void saveMonitoring(!enabled, frequency)}
              className="whitespace-nowrap"
            >
              {enabled ? "Pause auto-scan" : "Turn on auto-scan"}
            </Pill>

            <Pill
              size="sm"
              variant="secondary"
              icon="search"
              disabled={!canStandardScan || Boolean(scanning)}
              onClick={() => void scan("standard")}
              className="whitespace-nowrap"
            >
              {scanning === "standard" ? "Scanning…" : "Scan now"}
            </Pill>
          </div>
          <div className="text-right">
            <CostLine>{standardScanCost(usage)}</CostLine>
          </div>
        </div>
      )}

      {!archived && !canStandardScan && canDeepScan && (
        <p className="mt-2 text-right text-[12px] text-[var(--text-muted)]">
          {deepScanCost(credits)} — in the ⋯ menu
        </p>
      )}
    </article>
  );
}
