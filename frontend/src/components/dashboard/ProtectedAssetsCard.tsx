"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { AssetRow } from "@/components/dashboard/AssetRow";
import { Icon } from "@/components/dashboard/Icon";
import { useAssetStats } from "@/components/dashboard/AssetStatsProvider";
import { Panel } from "@/components/ui/Panel";
import { api, ApiError, type Asset } from "@/lib/api";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const LIST_LIMIT = 100;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ProtectedAssetsCard() {
  const { user, logout } = useAuth();
  const { refresh: refreshStats } = useAssetStats();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enableMonitoring, setEnableMonitoring] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setListError("");

    async function loadAssets() {
      try {
        const result = await api.listAssets(
          0,
          LIST_LIMIT,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setAssets(result);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        setListError(
          error instanceof ApiError
            ? error.message
            : "Unable to load artworks. Check the API connection and retry.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadAssets();

    return () => controller.abort();
  }, [user.id, logout, refreshKey]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    return () => uploadController.current?.abort();
  }, []);

  function selectFile(candidate: File | null) {
    setUploadError("");
    setSuccess("");

    if (!candidate) {
      return;
    }

    const validType =
      ALLOWED_TYPES.includes(candidate.type) ||
      (candidate.type === "" &&
        /\.(png|jpe?g|webp)$/i.test(candidate.name));

    let validationError = "";

    if (!validType) {
      validationError = "Please select a PNG, JPEG, or WEBP image.";
    } else if (candidate.size === 0) {
      validationError = "The selected file is empty.";
    } else if (candidate.size > MAX_FILE_BYTES) {
      validationError = "File size must not exceed 25 MiB.";
    }

    if (validationError) {
      setFile(null);
      setUploadError(validationError);

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      return;
    }

    setFile(candidate);

    if (!title.trim()) {
      setTitle(candidate.name.replace(/\.[^.]+$/, "").slice(0, 255));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (uploading || loading) {
      return;
    }

    if (event.dataTransfer.files.length !== 1) {
      setSuccess("");
      setUploadError("Please drop one image at a time.");
      return;
    }

    selectFile(event.dataTransfer.files.item(0));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || uploadController.current) {
      return;
    }

    setUploadError("");
    setSuccess("");

    const cleanTitle = title.trim();

    if (!cleanTitle || cleanTitle.length > 255) {
      setUploadError("Title must contain between 1 and 255 characters.");
      return;
    }

    if (!file) {
      setUploadError("Please select an image.");
      return;
    }

    const controller = new AbortController();
    uploadController.current = controller;
    setUploading(true);

    try {
      const created = await api.uploadAsset(
        cleanTitle,
        file,
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      setAssets((current) =>
        [created, ...current.filter((asset) => asset.id !== created.id)].slice(
          0,
          LIST_LIMIT,
        ),
      );

      setTitle("");
      setFile(null);

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      if (enableMonitoring) {
        try {
          await api.updateMonitoring(created.id, {
            enabled: true,
            alert_threshold_percent: 80,
            scan_frequency: "weekly",
          });

          setSuccess(
            `"${created.title}" was registered, protected, and is now being monitored.`,
          );
        } catch (monitoringError) {
          setSuccess(`"${created.title}" was registered and protected.`);
          setUploadError(
            monitoringError instanceof ApiError
              ? `Monitoring could not be turned on automatically: ${monitoringError.message}`
              : "Monitoring could not be turned on automatically. You can enable it from the artwork's card below.",
          );
        }
      } else {
        setSuccess(`"${created.title}" was registered and protected.`);
      }

      void refreshStats();
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setUploadError(
        error instanceof ApiError
          ? error.message
          : "Upload could not be confirmed. Refresh the artwork list before retrying.",
      );
    } finally {
      if (uploadController.current === controller) {
        uploadController.current = null;
      }

      if (!controller.signal.aborted) {
        setUploading(false);
      }
    }
  }

  function refreshAssets() {
    setLoading(true);
    setRefreshKey((value) => value + 1);
    void refreshStats();
  }

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
            My artworks
          </p>

          <h2 className="mt-1 font-heading text-[23px] font-semibold tracking-[-0.025em] text-[var(--text)]">
            Your registered artwork
          </h2>

          <p className="mt-2 text-[13px] leading-6 text-[var(--text-muted)]">
            Upload original images, download protected copies, and keep your
            work organized in one private place.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || uploading}
          onClick={refreshAssets}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="refresh" />
          Refresh
        </button>
      </div>

      <form
        id="asset-upload"
        onSubmit={handleUpload}
        aria-busy={uploading}
        className="mt-6 scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
            <Icon name="add_photo_alternate" />
          </div>

          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text)]">
              Upload artwork
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
              PNG, JPEG, and WEBP files are supported up to 25 MiB. A protected
              PNG copy is created when your image supports watermarking.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="asset-title"
              className="text-[12px] font-semibold text-[var(--text)]"
            >
              Artwork title
            </label>

            <input
              id="asset-title"
              name="title"
              type="text"
              required
              maxLength={255}
              disabled={uploading || loading}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your artwork a title"
              className="mt-2 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="rounded-lg border border-dashed border-[var(--primary)]/45 bg-[var(--surface)] p-3"
          >
            <label
              htmlFor="asset-file"
              className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-[var(--text)]"
            >
              <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">
                upload_file
              </span>
              Choose image or drop it here
            </label>

            <input
              ref={fileInput}
              id="asset-file"
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading || loading}
              onChange={(event) =>
                selectFile(event.target.files?.item(0) ?? null)
              }
              className="mt-2 block w-full text-[11px] text-[var(--text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--primary-soft)] file:px-3 file:py-1.5 file:text-[11px] file:font-semibold file:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            />

            {file && (
              <div className="mt-3 flex min-w-0 items-center gap-3 border-t border-[var(--border)] pt-3">
                {preview ? (
                  <img
                    src={preview}
                    alt="Selected artwork preview"
                    className="h-12 w-12 shrink-0 rounded-md object-cover"
                  />
                ) : null}

                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-[var(--text)]">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MiB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-[var(--surface)] px-3 py-2 text-[11px] leading-5 text-[var(--text-muted)]">
          Your original image remains private. Watermark availability depends
          on image dimensions and fully opaque image regions.
        </p>

        <label className="mt-4 flex items-start gap-2.5 rounded-lg bg-[var(--surface)] px-3 py-3 text-[12px] text-[var(--text)]">
          <input
            type="checkbox"
            checked={enableMonitoring}
            disabled={uploading || loading}
            onChange={(event) => setEnableMonitoring(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span>
            <span className="font-semibold">
              Start monitoring this artwork
            </span>
            <span className="mt-0.5 block text-[11px] leading-5 text-[var(--text-muted)]">
              Scans weekly for possible copies and alerts you above an 80%
              similarity match. You can change this anytime from the
              artwork&rsquo;s card below.
            </span>
          </span>
        </label>

        {uploadError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]"
          >
            {uploadError}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-[var(--success-soft)] px-3 py-2 text-[12px] text-[var(--success)]"
          >
            {success}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={uploading || loading || !file || !title.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary-strong)] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="cloud_upload" />
            {uploading ? "Uploading and protecting..." : "Upload artwork"}
          </button>

          {uploading && (
            <span role="status" className="text-[12px] text-[var(--text-muted)]">
              Processing your image. Please wait...
            </span>
          )}
        </div>
      </form>

      {listError && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]"
        >
          {listError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text)]">
            Recent artworks
          </h3>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            Your newest registered images appear first.
          </p>
        </div>

        {!loading && (
          <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
            {assets.length} shown
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
          <p role="status" className="text-[13px] text-[var(--text-muted)]">
            Loading your artworks...
          </p>
        </div>
      ) : assets.length === 0 && !listError ? (
        <div className="mt-5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Icon name="add_photo_alternate" />
          </div>

          <h3 className="mt-4 text-[15px] font-semibold text-[var(--text)]">
            Upload your first artwork
          </h3>

          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[var(--text-muted)]">
            Add an image above to create your first private asset record and
            protected copy.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {assets.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </Panel>
  );
}