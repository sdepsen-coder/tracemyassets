"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
} from "react";

import { AuthGate, useAuth } from "@/components/AuthGate";
import { Topbar } from "@/components/dashboard/Topbar";
import {
  api,
  ApiError,
  type Asset,
  type CandidateVerification,
} from "@/lib/api";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type SignalPresentation = {
  title: string;
  description: string;
  tone: "success" | "review" | "warning" | "neutral";
};

function getSignalPresentation(
  result: CandidateVerification,
): SignalPresentation {
  switch (result.overall_signal) {
    case "WATERMARK_VERIFIED":
      return {
        title: "Protected watermark verified",
        description:
          "This image contains a valid TraceMyAssets watermark connected to the selected artwork.",
        tone: "success",
      };

    case "STRONG_VISUAL_MATCH":
      return {
        title: "Strong visual match found",
        description:
          "This image appears highly similar to your registered artwork. Manual review is recommended.",
        tone: "review",
      };

    case "POSSIBLE_VISUAL_MATCH":
      return {
        title: "Possible visual match found",
        description:
          "Some visual similarities were detected. Review both images before drawing conclusions.",
        tone: "review",
      };

    case "WEAK_VISUAL_SIGNAL":
      return {
        title: "Limited visual similarity detected",
        description:
          "A small number of visual similarities were found, but the result is not strong.",
        tone: "warning",
      };

    default:
      return {
        title: "No strong visual match found",
        description:
          "This check did not find a strong technical similarity signal.",
        tone: "neutral",
      };
  }
}

function signalClasses(tone: SignalPresentation["tone"]): string {
  switch (tone) {
    case "success":
      return "border-[var(--success)]/35 bg-[var(--success-soft)] text-[var(--success)]";
    case "review":
      return "border-[var(--primary)]/30 bg-[var(--primary-soft)] text-[var(--primary)]";
    case "warning":
      return "border-[var(--warning)]/35 bg-[var(--warning-soft)] text-[var(--warning)]";
    default:
      return "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text)]";
  }
}

function formatTimestamp(timestamp: number): string {
  const value = new Date(timestamp * 1000);

  if (Number.isNaN(value.getTime())) {
    return "Unknown time";
  }

  return value.toLocaleString();
}

function CheckImageContent() {
  const { logout } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState("");

  const [assetId, setAssetId] = useState<number | null>(null);
  const [candidate, setCandidate] = useState<File | null>(null);
  const [candidatePreview, setCandidatePreview] = useState<string | null>(
    null,
  );
  const [result, setResult] = useState<CandidateVerification | null>(null);

  const [verificationError, setVerificationError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const verifyController = useRef<AbortController | null>(null);

  const selectedAsset =
    assets.find((asset) => asset.id === assetId) ?? null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadAssets() {
      setAssetsLoading(true);
      setAssetsError("");

      try {
        const response = await api.listAssets(0, 100, controller.signal);

        if (controller.signal.aborted) return;

        setAssets(response);

        if (response.length > 0) {
          setAssetId((current) => current ?? response[0].id);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          await logout();
          return;
        }

        setAssetsError(
          error instanceof ApiError
            ? error.message
            : "Unable to load your artworks. Check the API connection and retry.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setAssetsLoading(false);
        }
      }
    }

    void loadAssets();

    return () => controller.abort();
  }, [logout]);

  useEffect(() => {
    if (!candidate) {
      setCandidatePreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(candidate);
    setCandidatePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [candidate]);

  useEffect(() => {
    return () => verifyController.current?.abort();
  }, []);

  function selectCandidate(file: File | null) {
    setVerificationError("");
    setResult(null);

    if (!file) return;

    const validType =
      ALLOWED_TYPES.includes(file.type) ||
      (file.type === "" && /\.(png|jpe?g|webp)$/i.test(file.name));

    if (!validType) {
      setCandidate(null);
      setVerificationError("Please select a PNG, JPEG, or WEBP image.");
      return;
    }

    if (file.size === 0) {
      setCandidate(null);
      setVerificationError("The selected candidate image is empty.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setCandidate(null);
      setVerificationError("Candidate image size must not exceed 25 MiB.");
      return;
    }

    setCandidate(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectCandidate(event.target.files?.item(0) ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (verifying) return;

    if (event.dataTransfer.files.length !== 1) {
      setVerificationError("Please drop one image at a time.");
      return;
    }

    selectCandidate(event.dataTransfer.files.item(0));
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!assetId || !candidate || verifying) {
      return;
    }

    const controller = new AbortController();
    verifyController.current = controller;

    setVerifying(true);
    setVerificationError("");
    setResult(null);

    try {
      const response = await api.verifyCandidate(
        assetId,
        candidate,
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setResult(response);
      }
    } catch (error) {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        await logout();
        return;
      }

      setVerificationError(
        error instanceof ApiError
          ? error.message
          : "The verification request could not be completed.",
      );
    } finally {
      if (verifyController.current === controller) {
        verifyController.current = null;
      }

      if (!controller.signal.aborted) {
        setVerifying(false);
      }
    }
  }

  const presentation = result ? getSignalPresentation(result) : null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <Topbar />

      <main className="mx-auto w-full max-w-[1100px] px-4 py-7 sm:px-6 sm:py-10 xl:px-8">
        <div className="mb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--primary)] hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            Back to dashboard
          </Link>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            Image verification
          </p>

          <h1 className="mt-1 font-heading text-[30px] font-semibold tracking-[-0.035em] sm:text-[38px]">
            Check a suspicious image
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--text-muted)]">
            Select one of your registered artworks, then upload an image you
            want to compare. The candidate image is used only for this check
            and is not added to your permanent artwork storage.
          </p>
        </div>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-7">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[12px] font-bold text-[var(--primary)]">
                  1
                </span>
                <h2 className="text-[17px] font-semibold">
                  Select your artwork
                </h2>
              </div>

              <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">
                Choose the registered artwork that you want to use as the
                reference image.
              </p>

              {assetsLoading ? (
                <div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-4 text-[13px] text-[var(--text-muted)]">
                  Loading your artworks...
                </div>
              ) : assetsError ? (
                <div
                  role="alert"
                  className="mt-4 rounded-lg bg-[var(--danger-soft)] p-4 text-[13px] text-[var(--danger)]"
                >
                  {assetsError}
                </div>
              ) : assets.length === 0 ? (
                <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-5">
                  <p className="text-[14px] font-semibold">
                    No registered artwork yet
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">
                    Upload an artwork first, then return here to compare a
                    suspicious image.
                  </p>
                  <Link
                    href="/#asset-upload"
                    className="mt-4 inline-flex h-9 items-center rounded-lg bg-[var(--primary-strong)] px-3 text-[12px] font-semibold text-white"
                  >
                    Upload artwork
                  </Link>
                </div>
              ) : (
                <select
                  value={assetId ?? ""}
                  onChange={(event) => setAssetId(Number(event.target.value))}
                  disabled={verifying}
                  className="mt-4 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)]"
                >
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} — Asset #{asset.id}
                    </option>
                  ))}
                </select>
              )}

              {selectedAsset && (
                <div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Selected reference
                  </p>
                  <p className="mt-1 text-[14px] font-semibold">
                    {selectedAsset.title}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                    Asset #{selectedAsset.id}
                    {selectedAsset.watermarked_url
                      ? " • Protected copy available"
                      : " • Protection unavailable"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[12px] font-bold text-[var(--primary)]">
                  2
                </span>
                <h2 className="text-[17px] font-semibold">
                  Upload the candidate image
                </h2>
              </div>

              <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">
                Upload a PNG, JPG, or WEBP image up to 25 MiB.
              </p>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="mt-4 rounded-xl border border-dashed border-[var(--primary)]/45 bg-[var(--surface-muted)] p-5"
              >
                <input
                  ref={fileInput}
                  id="candidate-file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={verifying}
                  onChange={handleFileChange}
                  className="sr-only"
                />

                <label
                  htmlFor="candidate-file"
                  className="flex cursor-pointer flex-col items-center text-center"
                >
                  <span className="material-symbols-outlined text-[30px] text-[var(--primary)]">
                    upload_file
                  </span>
                  <span className="mt-2 text-[14px] font-semibold">
                    Choose image or drop it here
                  </span>
                  <span className="mt-1 text-[12px] text-[var(--text-muted)]">
                    Your candidate image is not permanently stored.
                  </span>
                </label>

                {candidate && (
                  <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4 text-left">
                    {candidatePreview ? (
                      <img
                        src={candidatePreview}
                        alt="Candidate image preview"
                        className="h-14 w-14 rounded-lg border border-[var(--border)] object-cover"
                      />
                    ) : null}

                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        {candidate.name}
                      </p>
                      <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                        {(candidate.size / (1024 * 1024)).toFixed(2)} MiB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleVerify} className="mt-7 border-t border-[var(--border)] pt-5">
            {verificationError && (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]"
              >
                {verificationError}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-[12px] leading-5 text-[var(--text-muted)]">
                The report provides technical signals only. It does not
                automatically establish ownership, copyright infringement, or
                legal liability.
              </p>

              <button
                type="submit"
                disabled={
                  verifying ||
                  assetsLoading ||
                  !selectedAsset ||
                  !candidate
                }
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--primary-strong)] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  search_check
                </span>
                {verifying ? "Checking image..." : "Check image"}
              </button>
            </div>
          </form>
        </section>

        {verifying && (
          <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-card">
            <span className="material-symbols-outlined animate-pulse text-[34px] text-[var(--primary)]">
              find_in_page
            </span>
            <h2 className="mt-3 text-[17px] font-semibold">
              Checking your image
            </h2>
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              Checking watermark, comparing visual similarity, and preparing
              your report...
            </p>
          </section>
        )}

        {result && presentation && (
          <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
              Verification result
            </p>

            <div
              className={[
                "mt-3 rounded-xl border p-5",
                signalClasses(presentation.tone),
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[28px]">
                  {result.watermark_verified
                    ? "verified"
                    : result.review_recommended
                      ? "visibility"
                      : "info"}
                </span>

                <div>
                  <h2 className="text-[20px] font-semibold">
                    {presentation.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[14px] leading-6">
                    {presentation.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--surface-muted)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Watermark
                </p>
                <p className="mt-2 text-[15px] font-semibold">
                  {result.watermark_verified
                    ? "Verified for this artwork"
                    : "Not verified for this artwork"}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
                  {result.watermark_payload && !result.watermark_verified
                    ? "A valid watermark was found, but it does not belong to the selected artwork."
                    : result.watermark_verified
                      ? "The candidate contains a valid watermark linked to the selected artwork."
                      : "No valid watermark linked to the selected artwork was recovered."}
                </p>
              </div>

              <div className="rounded-lg bg-[var(--surface-muted)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Visual comparison
                </p>
                <p className="mt-2 text-[15px] font-semibold">
                  {result.phash.similarity_percent.toFixed(2)}% similarity
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
                  Visual similarity and watermark verification are separate
                  technical signals.
                </p>
              </div>
            </div>

            <details className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-semibold">
                Technical details
              </summary>

              <div className="grid gap-4 border-t border-[var(--border)] px-4 py-4 text-[12px] text-[var(--text-muted)] sm:grid-cols-2">
                <div>
                  <p className="font-semibold text-[var(--text)]">
                    pHash comparison
                  </p>
                  <p className="mt-2">
                    Similarity: {result.phash.similarity_percent.toFixed(2)}%
                  </p>
                  <p>Hamming distance: {result.phash.hamming_distance}/64</p>
                </div>

                <div>
                  <p className="font-semibold text-[var(--text)]">
                    OpenCV feature comparison
                  </p>
                  <p className="mt-2">
                    Good matches: {result.orb.good_matches}
                  </p>
                  <p>
                    Geometric inliers: {result.orb.homography_inliers}
                  </p>
                  <p>
                    Inlier ratio:{" "}
                    {result.orb.inlier_ratio_percent === null
                      ? "Unavailable"
                      : `${result.orb.inlier_ratio_percent.toFixed(2)}%`}
                  </p>
                </div>

                {result.watermark_payload && (
                  <div className="sm:col-span-2">
                    <p className="font-semibold text-[var(--text)]">
                      Recovered watermark payload
                    </p>
                    <p className="mt-2">
                      Embedded asset ID: {result.watermark_payload.asset_id}
                    </p>
                    <p>
                      Embedded user ID: {result.watermark_payload.user_id}
                    </p>
                    <p>
                      Created: {formatTimestamp(result.watermark_payload.timestamp)}
                    </p>
                  </div>
                )}
              </div>
            </details>

            <p className="mt-5 text-[12px] leading-5 text-[var(--text-muted)]">
              This result is a technical signal only. It does not automatically
              establish ownership, copyright infringement, or legal liability.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default function CheckImagePage() {
  return (
    <AuthGate>
      <CheckImageContent />
    </AuthGate>
  );
}