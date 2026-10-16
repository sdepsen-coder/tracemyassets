"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { useAuth } from "@/components/AuthGate";
import {
  Card,
  Chip,
  CostLine,
  Notice,
  Pill,
  PillLink,
} from "@/components/app/ui";
import { Icon } from "@/components/dashboard/Icon";
import {
  api,
  ApiError,
  type Asset,
  type AssetScan,
  type CreditsInfo,
  type MatchRecord,
  type MonitoringPreference,
  type UsageInfo,
} from "@/lib/api";
import { countCards } from "@/lib/matchGroups";
import {
  allowsDaily,
  deepScanCost,
  DEFAULT_THRESHOLD,
  FREQUENCY_LABEL,
  nextScanDate,
  standardScanCost,
  standardScansLeft,
  type Frequency,
} from "@/lib/monitoring";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type Step = "upload" | "protect" | "scan" | "result";
type ScanKind = "standard" | "deep";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "protect", label: "Protect" },
  { id: "scan", label: "Scan" },
  { id: "result", label: "Results" },
];

// Shown one after another while a scan runs. They describe what every scan
// does; they are not live progress from the server.
const SCAN_STAGES = [
  "Searching the web for images like yours…",
  "Checking each result against your original…",
  "Looking for your invisible watermark…",
  "Putting the results together…",
];

function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function strengthOf(match: MatchRecord): { label: string; tone: "success" | "warning" } {
  const percent = Math.round(match.similarity_percent);

  if (match.watermark_verified || match.overall_signal === "STRONG_VISUAL_MATCH") {
    return { label: `Strong match · ${percent}%`, tone: "success" };
  }

  return { label: `Possible match · ${percent}%`, tone: "warning" };
}

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <Card className="mb-6 px-5 py-4 sm:px-8">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li
              key={step.id}
              className={[
                "flex items-center",
                index < STEPS.length - 1 ? "flex-1" : "",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    done || active
                      ? "bg-[var(--primary-strong)] text-[var(--on-primary)]"
                      : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {done ? <Icon name="check" className="text-[18px]" /> : index + 1}
                </span>
                <span
                  className={[
                    "hidden text-[14px] sm:inline",
                    active
                      ? "font-semibold text-[var(--text)]"
                      : "text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </span>

              {index < STEPS.length - 1 && (
                <span
                  className={[
                    "mx-3 h-0.5 flex-1 rounded-full",
                    done ? "bg-[var(--primary-strong)]" : "bg-[var(--border)]",
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function ChecklistRow({ done, failed, children }: {
  done: boolean;
  failed?: boolean;
  children: string;
}) {
  return (
    <li className="flex items-center gap-3 text-[15px]">
      <span
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full",
          failed
            ? "bg-[var(--warning-soft)] text-[var(--warning)]"
            : done
              ? "bg-[var(--success-soft)] text-[var(--success)]"
              : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        ].join(" ")}
      >
        <Icon
          name={failed ? "priority_high" : done ? "check" : "progress_activity"}
          className={`text-[17px] ${!done && !failed ? "animate-spin" : ""}`}
        />
      </span>
      <span className={done || failed ? "text-[var(--text)]" : "text-[var(--text-muted)]"}>
        {children}
      </span>
    </li>
  );
}

function ScanOption({
  selected,
  disabled,
  title,
  description,
  cost,
  icon,
  onSelect,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  description: string;
  cost: string;
  icon: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "flex h-full flex-col rounded-card border-2 p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-[var(--primary-strong)] bg-[var(--primary-soft)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary-strong)]",
      ].join(" ")}
    >
      <span className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--primary-strong)]">
          <Icon name={icon} className="text-[22px]" />
        </span>
        <span
          className={[
            "flex h-5 w-5 items-center justify-center rounded-full border-2",
            selected
              ? "border-[var(--primary-strong)] bg-[var(--primary-strong)]"
              : "border-[var(--border)]",
          ].join(" ")}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
      </span>
      <span className="mt-4 font-heading text-[18px] font-normal">{title}</span>
      <span className="mt-1 text-[14px] text-[var(--text-muted)]">{description}</span>
      <span className="mt-4 text-[13px] font-medium text-[var(--text)]">{cost}</span>
    </button>
  );
}

export function ProtectFlow() {
  const { user, logout } = useAuth();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [asset, setAsset] = useState<Asset | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);

  const [scanKind, setScanKind] = useState<ScanKind>("standard");
  const [autoScan, setAutoScan] = useState(true);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [scanning, setScanning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [scan, setScan] = useState<AssetScan | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringPreference | null>(null);
  const [monitoringError, setMonitoringError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // What a scan costs is shown before the user chooses one.
  useEffect(() => {
    const controller = new AbortController();

    api.getUsage(controller.signal).then(setUsage).catch(() => {});
    api.getCredits(controller.signal).then(setCredits).catch(() => {});

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!scanning) return;

    const timer = window.setInterval(() => {
      setStageIndex((index) => Math.min(index + 1, SCAN_STAGES.length - 1));
    }, 4000);

    return () => window.clearInterval(timer);
  }, [scanning]);

  const standardLeft = standardScansLeft(usage);
  const standardAvailable = standardLeft === null || standardLeft > 0;
  const deepAvailable =
    credits !== null && credits.balance >= credits.deep_scan_cost;

  // Pick whichever scan the user can actually run.
  useEffect(() => {
    if (scanKind === "standard" && !standardAvailable && deepAvailable) {
      setScanKind("deep");
    }
  }, [scanKind, standardAvailable, deepAvailable]);

  async function handleApiError(err: unknown, fallback: string) {
    if (err instanceof ApiError && err.status === 401) {
      await logout();
      return;
    }

    setError(err instanceof ApiError ? err.message : fallback);
  }

  function chooseFile(next: File | undefined) {
    setError("");

    if (!next) return;

    if (!ALLOWED_TYPES.includes(next.type)) {
      setError("Please choose a PNG, JPEG or WEBP image.");
      return;
    }

    if (next.size > MAX_FILE_BYTES) {
      setError("This image is larger than 25 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setTitle((current) => current || titleFromFileName(next.name));
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setTitle("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function upload() {
    if (!file || !title.trim() || busy) return;

    setBusy(true);
    setError("");
    setStep("protect");

    try {
      setAsset(await api.uploadAsset(title, file));
    } catch (err) {
      setStep("upload");
      await handleApiError(err, "The artwork could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadProtectedCopy() {
    if (!asset) return;

    try {
      const blob = await api.downloadWatermarked(asset.id);
      saveBlob(blob, `${asset.title || "artwork"}-protected.png`);
    } catch (err) {
      await handleApiError(err, "The protected copy could not be downloaded.");
    }
  }

  async function startScan() {
    if (!asset || scanning) return;

    setError("");
    setMonitoringError("");

    if (autoScan) {
      try {
        setMonitoring(
          await api.updateMonitoring(asset.id, {
            enabled: true,
            alert_threshold_percent: DEFAULT_THRESHOLD,
            scan_frequency: frequency,
          }),
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await logout();
          return;
        }
        // The scan still runs; automatic scans can be turned on later.
        setMonitoringError(
          err instanceof ApiError
            ? err.message
            : "Automatic scans could not be turned on.",
        );
      }
    }

    setStageIndex(0);
    setScanning(true);

    try {
      const result =
        scanKind === "deep"
          ? await api.runDeepScan(asset.id)
          : await api.runScan(asset.id);

      setScan(result);
      setStep("result");
    } catch (err) {
      await handleApiError(err, "The scan could not be completed.");
    } finally {
      setScanning(false);
    }
  }

  function startOver() {
    clearFile();
    setAsset(null);
    setScan(null);
    setMonitoring(null);
    setMonitoringError("");
    setError("");
    setStep("upload");
  }

  const copies = scan && !scan.credit_refunded ? countCards(scan.matches) : 0;
  // The scan that just finished counts as the latest one.
  const nextScan = monitoring
    ? nextScanDate({
        ...monitoring,
        last_scan_at: scan?.scan_job.completed_at ?? monitoring.last_scan_at,
      })
    : null;

  return (
    <>
      <Stepper current={step} />

      <Card className="p-6 sm:p-10">
        {step === "upload" && (
          <>
            <h1 className="font-heading text-[32px] font-light leading-tight tracking-[-0.02em] sm:text-[44px]">
              Protect a new artwork
            </h1>
            <p className="mt-3 text-[17px] text-[var(--text-muted)]">
              Upload your original. It stays private — we give you back a
              protected copy to share.
            </p>

            {file && previewUrl ? (
              <div className="mt-8 flex flex-col gap-6 rounded-card bg-[var(--surface-muted)] p-5 sm:flex-row sm:items-center">
                <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl sm:w-60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label="Remove this image"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow"
                  >
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>

                <div className="flex-1">
                  <label className="flex items-center justify-between text-[14px] font-semibold">
                    <span>Artwork title</span>
                    <span className="font-normal text-[var(--text-muted)]">
                      {formatSize(file.size)}
                    </span>
                  </label>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={255}
                    className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[16px] outline-none focus:border-[var(--primary-strong)]"
                  />
                  <p className="mt-2 text-[13px] text-[var(--text-muted)]">
                    Only you see this title.
                  </p>
                </div>
              </div>
            ) : (
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={[
                  "mt-8 flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-14 text-center transition",
                  dragging
                    ? "border-[var(--primary-strong)] bg-[var(--primary-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--primary-strong)]",
                ].join(" ")}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary-strong)] shadow-sm">
                  <Icon name="add_photo_alternate" className="text-[28px]" />
                </span>
                <span className="mt-4 text-[16px] font-semibold">
                  Drop your artwork here or{" "}
                  <span className="text-[var(--primary-strong)] underline">browse</span>
                </span>
                <span className="mt-1 text-[14px] text-[var(--text-muted)]">
                  PNG, JPEG or WEBP · up to 25 MB
                </span>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  className="sr-only"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    chooseFile(event.target.files?.[0])
                  }
                />
              </label>
            )}

            {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}

            <div className="mt-8 flex justify-end">
              <Pill
                onClick={upload}
                disabled={!file || !title.trim() || busy}
              >
                Continue
                <Icon name="arrow_forward" className="text-[18px]" />
              </Pill>
            </div>
          </>
        )}

        {step === "protect" && (
          <div className="flex flex-col items-center text-center">
            {previewUrl && (
              <div className="relative h-56 w-56 overflow-hidden rounded-card shadow-floating">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                {!asset && (
                  <span className="absolute inset-0 animate-pulse bg-gradient-to-b from-transparent via-white/30 to-transparent" />
                )}
              </div>
            )}

            <h1 className="mt-8 font-heading text-[28px] font-light tracking-[-0.02em] sm:text-[36px]">
              {asset ? "Your artwork is protected" : "Protecting your artwork…"}
            </h1>

            <ul className="mt-6 space-y-3 text-left">
              <ChecklistRow done={Boolean(asset)}>
                Saved privately to your account
              </ChecklistRow>
              <ChecklistRow done={Boolean(asset?.phash_value)}>
                Visual fingerprint created
              </ChecklistRow>
              <ChecklistRow
                done={Boolean(asset?.watermarked_url)}
                failed={Boolean(asset && !asset.watermarked_url)}
              >
                {asset && !asset.watermarked_url
                  ? "No watermark — this image is too small or too transparent"
                  : "Invisible watermark added"}
              </ChecklistRow>
            </ul>

            {asset && !asset.watermarked_url && (
              <p className="mt-4 max-w-[520px] text-[14px] text-[var(--text-muted)]">
                We can still find copies by how the image looks; only the
                watermark proof is missing.
              </p>
            )}

            {error && <div className="mt-6 w-full"><Notice tone="error">{error}</Notice></div>}

            {asset && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {asset.watermarked_url && (
                  <Pill variant="secondary" icon="download" onClick={downloadProtectedCopy}>
                    Download protected copy
                  </Pill>
                )}
                <Pill onClick={() => setStep("scan")}>
                  Continue
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Pill>
              </div>
            )}
          </div>
        )}

        {step === "scan" && !scanning && (
          <>
            <h1 className="font-heading text-[28px] font-light leading-tight tracking-[-0.02em] sm:text-[40px]">
              How should we look for copies?
            </h1>
            <p className="mt-3 text-[17px] text-[var(--text-muted)]">
              Choose a scan for <strong className="text-[var(--text)]">{asset?.title}</strong>.
              We show what it costs before anything runs.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <ScanOption
                selected={scanKind === "standard"}
                disabled={!standardAvailable}
                title="Standard scan"
                description="Searches the web for images like yours."
                cost={standardScanCost(usage)}
                icon="travel_explore"
                onSelect={() => setScanKind("standard")}
              />
              <ScanOption
                selected={scanKind === "deep"}
                disabled={!deepAvailable}
                title="Deep scan"
                description="Looks further and finds more hidden copies."
                cost={deepScanCost(credits)}
                icon="radar"
                onSelect={() => setScanKind("deep")}
              />
            </div>

            <div className="mt-6 rounded-card border border-[var(--border)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-semibold">Keep watching automatically</p>
                  <p className="mt-1 text-[14px] text-[var(--text-muted)]">
                    Automatic scans are included in your plan and don&apos;t use
                    your monthly scans. You can pause them any time.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoScan}
                  aria-label="Keep watching automatically"
                  onClick={() => setAutoScan((value) => !value)}
                  className={[
                    "relative h-7 w-12 shrink-0 rounded-full transition",
                    autoScan ? "bg-[var(--primary-strong)]" : "bg-[var(--border)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
                      autoScan ? "left-6" : "left-1",
                    ].join(" ")}
                  />
                </button>
              </div>

              {autoScan && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["daily", "weekly", "monthly"] as Frequency[]).map((option) => {
                    const locked = option === "daily" && !allowsDaily(user.plan_type);

                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={locked}
                        onClick={() => setFrequency(option)}
                        aria-pressed={frequency === option}
                        title={locked ? "Daily scans come with Pro and Extra" : undefined}
                        className={[
                          "inline-flex h-9 items-center gap-1 rounded-full px-4 text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                          frequency === option
                            ? "bg-[var(--primary-strong)] text-[var(--on-primary)]"
                            : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)]",
                        ].join(" ")}
                      >
                        {locked && <Icon name="lock" className="text-[15px]" />}
                        {FREQUENCY_LABEL[option]}
                        {locked && <span className="font-normal">· Pro</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {!standardAvailable && !deepAvailable && (
              <div className="mt-6">
                <Notice>
                  You have no scans left right now. Automatic scans still run,
                  or you can get more Deep scan credits on your Account page.
                </Notice>
              </div>
            )}

            {error && <div className="mt-6"><Notice tone="error">{error}</Notice></div>}

            <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <PillLink href="/" variant="secondary">
                Skip for now
              </PillLink>
              <div className="text-right">
                <Pill
                  onClick={startScan}
                  disabled={scanKind === "standard" ? !standardAvailable : !deepAvailable}
                  icon="search"
                >
                  Start scan
                </Pill>
                <CostLine>
                  {scanKind === "deep" ? deepScanCost(credits) : standardScanCost(usage)}
                </CostLine>
              </div>
            </div>
          </>
        )}

        {step === "scan" && scanning && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="relative flex h-64 w-64 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--primary-soft)] opacity-60 [animation-duration:2.5s]" />
              <span className="absolute inset-4 rounded-full bg-[var(--primary-soft)]" />
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="relative h-44 w-44 rounded-full border-4 border-[var(--surface)] object-cover shadow-floating"
                />
              )}
            </div>

            <h1 className="mt-6 font-heading text-[26px] font-light tracking-[-0.02em] sm:text-[32px]">
              Looking for copies of {asset?.title}
            </h1>

            <ul className="mt-6 w-full max-w-[460px] space-y-3 rounded-card bg-[var(--surface-muted)] p-5 text-left">
              {SCAN_STAGES.map((stage, index) => (
                <ChecklistRow key={stage} done={index < stageIndex}>
                  {stage}
                </ChecklistRow>
              )).slice(0, stageIndex + 1)}
            </ul>

            <p className="mt-6 flex items-center gap-2 text-[14px] text-[var(--text-muted)]">
              <Icon name="info" className="text-[18px]" />
              This usually takes a minute or two. Please keep this page open.
            </p>
          </div>
        )}

        {step === "result" && scan && (
          <div className="flex flex-col items-center text-center">
            {scan.credit_refunded ? (
              <>
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--warning-soft)] text-[var(--warning)]">
                  <Icon name="replay" className="text-[40px]" />
                </span>
                <h1 className="mt-6 font-heading text-[28px] font-light tracking-[-0.02em]">
                  The Deep scan couldn&apos;t run just now
                </h1>
                <p className="mt-3 max-w-[520px] text-[16px] text-[var(--text-muted)]">
                  Your credit was returned. Please try again in a little while,
                  or run a Standard scan instead.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Pill variant="secondary" onClick={() => setStep("scan")}>
                    Choose another scan
                  </Pill>
                  <PillLink href="/">Go to Monitoring</PillLink>
                </div>
              </>
            ) : copies > 0 ? (
              <>
                <h1 className="font-heading text-[30px] font-light tracking-[-0.02em] sm:text-[40px]">
                  We found {copies} possible {copies === 1 ? "copy" : "copies"}
                </h1>
                <p className="mt-3 max-w-[560px] text-[16px] text-[var(--text-muted)]">
                  Each one was compared with your original. Look at them side
                  by side and tell us which ones are really yours.
                </p>

                <ul className="mt-8 flex w-full max-w-[560px] flex-col gap-2 text-left">
                  {scan.matches.slice(0, 3).map((match) => {
                    const strength = strengthOf(match);

                    return (
                      <li
                        key={match.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-4 py-3"
                      >
                        <span className="text-[14px] text-[var(--text-muted)]">
                          {match.source_locked
                            ? "Website hidden on your plan"
                            : match.source_name || "Web page"}
                        </span>
                        <span className="flex gap-2">
                          {match.watermark_verified && (
                            <Chip tone="success" icon="verified_user">Watermark found</Chip>
                          )}
                          <Chip tone={strength.tone}>{strength.label}</Chip>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <PillLink href="/" variant="secondary">Go to Monitoring</PillLink>
                  <PillLink href="/matches" icon="arrow_forward">Review the copies</PillLink>
                </div>
              </>
            ) : (
              <>
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                  <Icon name="verified" className="text-[40px]" />
                </span>
                <h1 className="mt-6 font-heading text-[30px] font-light tracking-[-0.02em] sm:text-[40px]">
                  No copies found right now
                </h1>
                <p className="mt-3 max-w-[520px] text-[16px] text-[var(--text-muted)]">
                  {monitoring?.enabled
                    ? "Good news. We'll keep watching and show you if anything appears."
                    : "Good news. Turn on automatic scans on the Monitoring page to keep watching."}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Pill variant="secondary" onClick={startOver}>
                    Protect another artwork
                  </Pill>
                  <PillLink href="/">Go to Monitoring</PillLink>
                </div>
              </>
            )}

            {monitoring?.enabled && (
              <div className="mt-8 w-full">
                <Notice tone="success">
                  {asset?.title} is now scanned{" "}
                  {FREQUENCY_LABEL[monitoring.scan_frequency].toLowerCase()}.
                  {nextScan && nextScan.getTime() > Date.now()
                    ? ` Next scan: ${nextScan.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}.`
                    : ""}
                </Notice>
              </div>
            )}

            {monitoringError && (
              <div className="mt-4 w-full">
                <Notice tone="error">
                  Automatic scans are not on: {monitoringError}
                </Notice>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
