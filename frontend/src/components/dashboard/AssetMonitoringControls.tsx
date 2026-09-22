"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import {
  api,
  ApiError,
  type AssetScan,
  type MonitoringPreference,
} from "@/lib/api";

type AssetMonitoringControlsProps = {
  assetId: number;
};

type Frequency = "daily" | "weekly" | "monthly";

function frequencyLabel(value: Frequency): string {
  switch (value) {
    case "daily":
      return "Daily";
    case "monthly":
      return "Monthly";
    default:
      return "Weekly";
  }
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

  async function runDemoScan() {
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
      setMessage(
        result.matches.length === 1
          ? "Demo scan found 1 match requiring review."
          : `Demo scan found ${result.matches.length} matches requiring review.`,
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
          : "Demo scan could not be completed.",
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                enabled
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-[var(--surface)] text-[var(--text-muted)]",
              ].join(" ")}
            >
              {enabled ? "Monitoring active" : "Monitoring inactive"}
            </span>

            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
              Alert threshold: {threshold}%
            </span>

            <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
              {frequencyLabel(frequency)}
            </span>
          </div>

          <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
            Enable monitoring to alert you when supported sources return
            possible matches above your chosen similarity threshold.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => void runDemoScan()}
            title="Uses the fake provider for development testing."
            className="inline-flex h-9 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scanning ? "Scanning..." : "Run demo scan"}
          </button>
        </div>
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
            Demo scan completed
          </p>
          <p className="mt-1">
            Candidates checked: {scanResult.scan_job.candidate_count}
          </p>
          <p>Matches requiring review: {scanResult.scan_job.match_count}</p>
          <p className="mt-2 leading-5">
            This demo scan uses a fake provider. It does not scan the public
            web yet.
          </p>
        </div>
      )}

      {preference && (
        <p className="mt-3 text-[11px] leading-5 text-[var(--text-muted)]">
          Monitoring settings are saved per artwork. Results are technical
          signals only and require manual review.
        </p>
      )}
    </div>
  );
}