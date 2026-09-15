"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import { api, ApiError, type Asset } from "@/lib/api";

type AssetRowProps = {
  asset: Asset;
};

type DownloadKind = "original" | "watermarked";

export function AssetRow({ asset }: AssetRowProps) {
  const { user, logout } = useAuth();

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [downloading, setDownloading] = useState<DownloadKind | null>(
    null,
  );
  const [downloadError, setDownloadError] = useState("");

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
        const blob = await api.thumbnail(
          asset.id,
          controller.signal,
        );

        if (controller.signal.aborted) return;

        objectUrl = URL.createObjectURL(blob);
        setThumbnail(objectUrl);
      } catch (error) {
        if (controller.signal.aborted) return;

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
    if (downloadController.current) return;

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
          ? await api.downloadWatermarked(
              asset.id,
              controller.signal,
            )
          : await api.downloadOriginal(
              asset.id,
              controller.signal,
            );

      if (controller.signal.aborted) return;

      const extensions: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
      };

      const mediaType = blob.type
        .split(";")[0]
        .trim()
        .toLowerCase();

      const extension = extensions[mediaType];

      if (
        !extension ||
        (kind === "watermarked" && mediaType !== "image/png")
      ) {
        throw new Error(
          "The server returned an unexpected file format.",
        );
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download =
        kind === "watermarked"
          ? `asset-${asset.id}-watermarked.png`
          : `asset-${asset.id}.${extension}`;

      document.body.appendChild(link);

      try {
        link.click();
      } finally {
        link.remove();

        // Give the browser time to start downloading the blob.
        window.setTimeout(
          () => URL.revokeObjectURL(objectUrl),
          30_000,
        );
      }
    } catch (error) {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setDownloadError(
        error instanceof Error
          ? error.message
          : "Download failed.",
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

  const isDownloading = downloading !== null;
  const hasWatermark = Boolean(asset.watermarked_url);

  return (
    <div className="rounded-2xl border border-white/8 bg-[#1a1f2d] p-4 transition hover:bg-[#252a38]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#303443] shadow-md">
            {thumbnail && !thumbnailError ? (
              <img
                src={thumbnail}
                alt={asset.title}
                className="h-full w-full object-cover"
                onError={() => setThumbnailError(true)}
              />
            ) : (
              <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-slate-400">
                {thumbnailError ? "No preview" : "Loading..."}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h4
              title={asset.title}
              className="truncate text-[15px] font-semibold text-slate-100"
            >
              {asset.title}
            </h4>

            <p className="text-[12px] leading-5 text-slate-400">
              Asset #{asset.id} &middot;{" "}
              {new Date(asset.created_at).toLocaleDateString(
                "en-US",
              )}
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-md bg-sky-400/10 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                Registered
              </span>

              <span className="rounded-md bg-white/8 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                {asset.phash_value
                  ? "pHash available"
                  : "pHash unavailable"}
              </span>

              {hasWatermark && (
                <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  Watermarked
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-400">
            Scanner not connected
          </span>

          <span
            className={`text-[12px] font-semibold ${
              asset.status === "active"
                ? "text-emerald-300"
                : "text-slate-400"
            }`}
          >
            {asset.status === "active" ? "Active" : "Archived"}
          </span>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownload("original")}
              className="text-[12px] font-semibold text-sky-300 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading === "original"
                ? "Downloading..."
                : "Download original"}
            </button>

            <button
              type="button"
              disabled={isDownloading || !hasWatermark}
              onClick={() => void handleDownload("watermarked")}
              title={
                hasWatermark
                  ? "Download the watermarked PNG"
                  : "No watermarked file is available"
              }
              className="text-[12px] font-semibold text-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading === "watermarked"
                ? "Downloading..."
                : "Download watermarked"}
            </button>
          </div>

          {isDownloading && (
            <p
              role="status"
              className="text-[11px] text-slate-400"
            >
              Preparing your download...
            </p>
          )}
        </div>
      </div>

      <p
        title={asset.phash_value ?? undefined}
        className="mt-3 truncate font-mono text-[11px] text-slate-400"
      >
        pHash: {asset.phash_value ?? "Not available"}
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {hasWatermark
          ? "Watermarked file available."
          : "No watermark has been applied."}
      </p>

      {downloadError && (
        <p
          role="alert"
          className="mt-3 text-xs text-rose-300"
        >
          {downloadError}
        </p>
      )}
    </div>
  );
}