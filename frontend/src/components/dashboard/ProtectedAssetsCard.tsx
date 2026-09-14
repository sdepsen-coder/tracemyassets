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
import { Panel } from "@/components/ui/Panel";
import { api, ApiError, type Asset } from "@/lib/api";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const LIST_LIMIT = 100;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ProtectedAssetsCard() {
  const { user, logout } = useAuth();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        setListError(
          error instanceof ApiError
            ? error.message
            : "Unable to load assets. Check the API connection and retry.",
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

    if (!candidate) return;

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
      setTitle(
        candidate.name.replace(/\.[^.]+$/, "").slice(0, 255),
      );
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (uploading || loading) return;

    if (event.dataTransfer.files.length !== 1) {
      setSuccess("");
      setUploadError("Please drop one image at a time.");
      return;
    }

    selectFile(event.dataTransfer.files.item(0));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || uploadController.current) return;

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

      if (controller.signal.aborted) return;

      setAssets((current) =>
        [
          created,
          ...current.filter((asset) => asset.id !== created.id),
        ].slice(0, LIST_LIMIT),
      );

      setTitle("");
      setFile(null);

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      setSuccess(`"${created.title}" was registered successfully.`);
    } catch (error) {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setUploadError(
        error instanceof ApiError
          ? error.message
          : "Upload could not be confirmed. Refresh the asset list before retrying; the server may have saved the file.",
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

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-100">
            Protected Assets
          </h3>
          <p className="mt-1 text-[12px] text-slate-400">
            Registered files and visual fingerprints from your account.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
            Live data
          </span>

          <button
            type="button"
            disabled={loading || uploading}
            onClick={() => {
              setLoading(true);
              setRefreshKey((value) => value + 1);
            }}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <form
        id="asset-upload"
        onSubmit={handleUpload}
        aria-busy={uploading}
        className="mt-5 scroll-mt-28 space-y-4 rounded-2xl border border-white/10 bg-[#090e1b] p-4"
      >
        <div>
          <h4 className="font-semibold text-slate-100">Upload asset</h4>
          <p className="mt-1 text-xs text-slate-400">
            PNG, JPEG, or WEBP. Maximum 25 MiB per file.
          </p>
        </div>

        <div>
          <label htmlFor="asset-title" className="text-sm text-slate-300">
            Title
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
            placeholder="Give your asset a name"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#161b29] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-400 disabled:opacity-50"
          />
        </div>

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className="rounded-xl border border-dashed border-sky-400/30 bg-sky-400/5 p-4"
        >
          <label
            htmlFor="asset-file"
            className="block text-sm text-slate-300"
          >
            Drop an image here or choose a file
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
            className="mt-3 block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-400/15 file:px-3 file:py-2 file:font-semibold file:text-sky-300 disabled:opacity-50"
          />

          {file && (
            <div className="mt-4 flex min-w-0 items-center gap-3">
              {preview && (
                <img
                  src={preview}
                  alt="Selected asset preview"
                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                />
              )}

              <div className="min-w-0">
                <p className="truncate text-sm text-slate-200">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MiB
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-amber-200/80">
          Uploading registers your file and generates a visual fingerprint.
          Invisible watermarking is not enabled yet.
        </p>

        {uploadError && (
          <p role="alert" className="text-sm text-rose-300">
            {uploadError}
          </p>
        )}

        {success && (
          <p role="status" className="text-sm text-emerald-300">
            {success}
          </p>
        )}

        {uploading && (
          <p role="status" className="text-sm text-sky-300">
            Uploading and processing your image. Please wait...
          </p>
        )}

        <button
          type="submit"
          disabled={uploading || loading || !file || !title.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4cd7f6] px-4 py-2.5 text-sm font-semibold text-[#003640] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading and processing..." : "Upload asset"}
        </button>
      </form>

      {listError && (
        <p role="alert" className="mt-5 text-sm text-rose-300">
          {listError}
        </p>
      )}

      {loading ? (
        <p role="status" className="mt-5 text-sm text-slate-400">
          Loading your assets...
        </p>
      ) : assets.length === 0 && !listError ? (
        <div className="mt-5 rounded-xl border border-white/10 p-6 text-center">
          <p className="font-semibold text-slate-200">No assets yet</p>
          <p className="mt-2 text-sm text-slate-400">
            Upload your first image using the form above.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {assets.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        {loading
          ? "Fetching account assets..."
          : `${assets.length} assets displayed. This MVP view shows up to ${LIST_LIMIT} assets.`}
      </p>
    </Panel>
  );
}