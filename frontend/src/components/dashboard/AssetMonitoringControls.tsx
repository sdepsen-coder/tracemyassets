"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import {
  api,
  ApiError,
  type AssetScan,
  type MonitoringPreference,
  type ScanDiagnostics,
} from "@/lib/api";

/** Plain-language reasons why scan candidates did not become matches. */
function describeScanDiagnostics(
  diagnostics: ScanDiagnostics | null | undefined,
  thresholdPercent: number,
): string[] {
  if (!diagnostics) return [];

  const plural = (count: number, one: string, many: string) =>
    `${count} ${count === 1 ? one : many}`;

  const lines: string[] = [];

  if (diagnostics.candidates === 0) {
    lines.push("The search sources returned no candidate images to check.");
    return lines;
  }

  if (diagnostics.image_unreachable > 0) {
    lines.push(
      `${plural(
        diagnostics.image_unreachable,
        "image could",
        "images could",
      )} not be downloaded.`,
    );
  }

  if (diagnostics.no_image_address > 0) {
    lines.push(
      `${plural(
        diagnostics.no_image_address,
        "result had",
        "results had",
      )} no image address to compare.`,
    );
  }

  if (diagnostics.not_comparable > 0) {
    lines.push(
      `${plural(
        diagnostics.not_comparable,
        "file was",
        "files were",
      )} not a usable image.`,
    );
  }

  if (diagnostics.below_threshold > 0) {
    const best =
      diagnostics.best_similarity_percent === null
        ? ""
        : ` Closest was ${diagnostics.best_similarity_percent.toFixed(0)}%.`;

    lines.push(
      `${plural(
        diagnostics.below_threshold,
        "image was",
        "images were",
      )} below your ${thresholdPercent.toFixed(0)}% similarity threshold.${best}`,
    );
  }

  if (diagnostics.page_gone > 0) {
    lines.push(
      `${plural(
        diagnostics.page_gone,
        "match was",
        "matches were",
      )} left out because the page no longer exists.`,
    );
  }

  if (diagnostics.page_unrelated > 0) {
    lines.push(
      `${plural(
        diagnostics.page_unrelated,
        "match was",
        "matches were",
      )} left out because the page does not show the image.`,
    );
  }

  return lines;
}

type AssetMonitoringControlsProps = {
  assetId: number;
};

type Frequency = "daily" | "weekly" | "monthly";

const FREQUENCY_DAYS: Record<Frequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function nextScanDueLabel(
  lastScanAt: string | null,
  frequency: Frequency,
): string {
  if (!lastScanAt) {
    return "Due at the next check";
  }

  const last = new Date(lastScanAt);

  if (Number.isNaN(last.getTime())) {
    return "Due at the next check";
  }

  const due = new Date(last);
  due.setDate(due.getDate() + FREQUENCY_DAYS[frequency]);

  return due <= new Date()
    ? "Due at the next check"
    : formatDateTime(due.toISOString());
}

export function AssetMonitoringControls({
  assetId,
}: AssetMonitoringControlsProps) {
  const { logout } = useAuth();

  const [preference, setPreference] =
    useState<MonitoringPreference | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(80);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [expanded, setExpanded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanResult, setScanResult] = useState<AssetScan | null>(null);

  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestController.current = controller;

    async function loadMonitoring() {
      setLoading(true);
      setError("");
      setMessage("");
      setScanResult(null);

      try {
        const result = await api.getMonitoring(assetId, controller.signal);

        if (controller.signal.aborted) return;

        setPreference(result);
        setEnabled(result.enabled);
        setThreshold(Math.round(result.alert_threshold_percent));
        setFrequency(result.scan_frequency);
      } catch (err) {
        if (controller.signal.aborted) return;

        if (err instanceof ApiError && err.status === 401) {
          await logout();
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "Monitoring settings could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadMonitoring();

    return () => {
      controller.abort();

      if (requestController.current === controller) {
        requestController.current = null;
      }
    };
  }, [assetId, logout]);

  async function saveMonitoring() {
    if (saving || scanning) return;

    const cleanThreshold = Math.min(100, Math.max(1, threshold));

    const controller = new AbortController();
    requestController.current = controller;

    setSaving(true);
    setError("");
    setMessage("");
    setScanResult(null);

    try {
      const result = await api.updateMonitoring(
        assetId,
        {
          enabled,
          alert_threshold_percent: cleanThreshold,
          scan_frequency: frequency,
        },
        controller.signal,
      );

      if (controller.signal.aborted) return;

      setPreference(result);
      setThreshold(Math.round(result.alert_threshold_percent));
      setMessage("Monitoring settings saved.");
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof ApiError && err.status === 401) {
        await logout();
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Monitoring settings could not be saved.",
      );
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
      }

      if (!controller.signal.aborted) {
        setSaving(false);
      }
    }
  }

  const scanDetails = scanResult
    ? describeScanDiagnostics(
        scanResult.diagnostics,
        scanResult.threshold_percent,
      )
    : [];

  async function runScanNow() {
    if (saving || scanning) return;

    const controller = new AbortController();
    requestController.current = controller;

    setScanning(true);
    setError("");
    setMessage("");
    setScanResult(null);

    try {
      const result = await api.runScan(assetId, controller.signal);

      if (controller.signal.aborted) return;

      setScanResult(result);
      setPreference((current) =>
        current
          ? {
              ...current,
              last_scan_at:
                result.scan_job.completed_at ?? current.last_scan_at,
            }
          : current,
      );
      setMessage(
        result.matches.length === 1
          ? "Scan complete: 1 match found requiring review."
          : `Scan complete: ${result.matches.length} matches found requiring review.`,
      );
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof ApiError && err.status === 401) {
        await logout();
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Scan could not be completed.",
      );
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
      }

      if (!controller.signal.aborted) {
        setScanning(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-[12px] text-[var(--text-muted)]">
        Loading monitoring settings...
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
              enabled
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--surface)] text-[var(--text-muted)]",
            ].join(" ")}
          >
            {enabled ? "Monitoring active" : "Monitoring off"}
          </span>

          {enabled && (
            <>
              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                Last scan:{" "}
                {preference?.last_scan_at
                  ? formatDateTime(preference.last_scan_at)
                  : "Not yet scanned"}
              </span>

              <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                Next scan:{" "}
                {nextScanDueLabel(
                  preference?.last_scan_at ?? null,
                  frequency,
                )}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex h-8 shrink-0 items-center gap-1 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-raised)] sm:self-auto"
        >
          {expanded ? "Hide settings" : "Manage monitoring"}
          <span className="material-symbols-outlined text-[16px]">
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>

      {expanded && (
        <>
          <p className="mt-4 text-[12px] leading-5 text-[var(--text-muted)]">
            Enable monitoring to alert you when supported sources return
            possible matches above your chosen similarity threshold.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving || scanning}
              onClick={() => setEnabled((value) => !value)}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enabled ? "Turn off" : "Turn on"}
            </button>

            <button
              type="button"
              disabled={saving || scanning}
              onClick={() => void saveMonitoring()}
              className="inline-flex h-9 items-center rounded-lg bg-[var(--primary-strong)] px-3 text-[12px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              disabled={saving || scanning}
              onClick={() => void runScanNow()}
              title="Trigger a scan immediately instead of waiting for the next scheduled check."
              className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Run scan now"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] font-semibold text-[var(--text)]">
              Alert threshold
              <input
                type="number"
                min={1}
                max={100}
                value={threshold}
                disabled={saving || scanning}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="mt-2 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] disabled:opacity-50"
              />
            </label>

            <label className="text-[12px] font-semibold text-[var(--text)]">
              Scan frequency
              <select
                value={frequency}
                disabled={saving || scanning}
                onChange={(event) =>
                  setFrequency(event.target.value as Frequency)
                }
                className="mt-2 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] disabled:opacity-50"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>

          {message && (
            <p
              role="status"
              className="mt-3 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[12px] text-[var(--success)]"
            >
              {message}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]"
            >
              {error}
            </p>
          )}

          {scanResult && (
            <div className="mt-3 rounded-lg bg-[var(--surface)] px-3 py-3 text-[12px] text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text)]">
                Scan completed ({scanResult.provider})
              </p>
              <p className="mt-1">
                Candidates checked: {scanResult.scan_job.candidate_count}
              </p>
              <p>
                Matches requiring review: {scanResult.scan_job.match_count}
              </p>

              {scanDetails.length > 0 && (
                <div className="mt-2 border-t border-[var(--border)] pt-2">
                  <p className="font-semibold text-[var(--text)]">
                    What happened to the rest
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {scanDetails.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {preference && (
            <p className="mt-3 text-[11px] leading-5 text-[var(--text-muted)]">
              Monitoring settings are saved per artwork. Results are technical
              signals only and require manual review.
            </p>
          )}
        </>
      )}
    </div>
  );
}
