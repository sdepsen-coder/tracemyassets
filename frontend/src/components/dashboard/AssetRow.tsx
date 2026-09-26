"use client";

import { useEffect, useRef, useState } from "react";
import { AssetMonitoringControls } from "./AssetMonitoringControls";
import { useAuth } from "@/components/AuthGate";
import { api, ApiError, type Asset } from "@/lib/api";
import { Icon } from "./Icon";

type AssetRowProps = {
  asset: Asset;
  onArchiveChange?: () => void;
};

type DownloadKind = "original" | "watermarked";

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

export function AssetRow({ asset, onArchiveChange }: AssetRowProps) {
  const { user, logout } = useAuth();

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [downloading, setDownloading] = useState<DownloadKind | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  const downloadController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    setThumbnail(null);
    setThumbnailError(false);
    setDownloading(null);
    setDownloadError("");

    async function loadThumbnail() {
      try {
        const blob = await api.thumbnail(asset.id, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setThumbnail(objectUrl);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        setThumbnailError(true);
      }
    }

    void loadThumbnail();

    return () => {
      controller.abort();

      downloadController.current?.abort();
      downloadController.current = null;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [asset.id, user.id, logout]);

  async function handleDownload(kind: DownloadKind) {
    if (downloadController.current) {
      return;
    }

    if (kind === "watermarked" && !asset.watermarked_url) {
      return;
    }

    const controller = new AbortController();
    downloadController.current = controller;

    setDownloading(kind);
    setDownloadError("");

    try {
      const blob =
        kind === "watermarked"
          ? await api.downloadWatermarked(asset.id, controller.signal)
          : await api.downloadOriginal(asset.id, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      const extensions: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
      };

      const mediaType = blob.type.split(";")[0].trim().toLowerCase();
      const extension = extensions[mediaType];

      if (
        !extension ||
        (kind === "watermarked" && mediaType !== "image/png")
      ) {
        throw new Error("The server returned an unexpected file format.");
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download =
        kind === "watermarked"
          ? `asset-${asset.id}-protected.png`
          : `asset-${asset.id}.${extension}`;

      document.body.appendChild(link);

      try {
        link.click();
      } finally {
        link.remove();

        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 30_000);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setDownloadError(
        error instanceof Error ? error.message : "Download failed.",
      );
    } finally {
      if (downloadController.current === controller) {
        downloadController.current = null;

        if (!controller.signal.aborted) {
          setDownloading(null);
        }
      }
    }
  }

  async function handleArchiveToggle() {
    if (archiving) return;

    const nextArchived = asset.status !== "archived";

    setArchiving(true);
    setArchiveError("");

    try {
      await api.archiveAsset(asset.id, nextArchived);

      onArchiveChange?.();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setArchiveError(
        error instanceof ApiError
          ? error.message
          : "This artwork could not be updated.",
      );
    } finally {
      setArchiving(false);
    }
  }

  const isDownloading = downloading !== null;
  const hasWatermark = Boolean(asset.watermarked_url);
  const isArchived = asset.status === "archived";

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:bg-[var(--surface-muted)] sm:p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
            {thumbnail && !thumbnailError ? (
              <img
                src={thumbnail}
                alt={asset.title}
                className="h-full w-full object-cover"
                onError={() => setThumbnailError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                <Icon name={thumbnailError ? "broken_image" : "image"} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3
              title={asset.title}
              className="truncate text-[15px] font-semibold text-[var(--text)]"
            >
              {asset.title}
            </h3>

            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Uploaded {formatDate(asset.created_at)} · Asset #{asset.id}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {hasWatermark ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
                  <Icon name="verified_user" />
                  Protected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning)]">
                  <Icon name="warning" />
                  Protection unavailable
                </span>
              )}

              {isArchived && (
                <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)]">
                  Archived
                </span>
              )}

              {asset.phash_value && (
                <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                  Visual fingerprint ready
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => void handleDownload("original")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="download" />
            {downloading === "original" ? "Preparing..." : "Original"}
          </button>

          <button
            type="button"
            disabled={isDownloading || !hasWatermark}
            onClick={() => void handleDownload("watermarked")}
            title={
              hasWatermark
                ? "Download the protected PNG copy"
                : "No protected copy is available"
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary-strong)] px-3 text-[12px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="download" />
            {downloading === "watermarked"
              ? "Preparing..."
              : "Protected copy"}
          </button>
          <button
            type="button"
            disabled={isDownloading || archiving}
            onClick={() => void handleArchiveToggle()}
            title={
              isArchived
                ? "Restore this artwork to your active list"
                : "Archive this artwork and turn off its monitoring"
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name={isArchived ? "unarchive" : "archive"} />
            {archiving
              ? "Updating..."
              : isArchived
                ? "Restore"
                : "Archive"}
          </button>
        </div>
      </div>

      {archiveError && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]"
        >
          {archiveError}
        </p>
      )}

      {downloadError && (
        <p
          role="alert"
          className="mt-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-[12px] text-[var(--danger)]"
        >
          {downloadError}
        </p>
      )}

      {!isArchived && <AssetMonitoringControls assetId={asset.id} />}
    </article>
  );
}