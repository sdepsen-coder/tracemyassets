"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/AuthGate";
import { api, ApiError, type AssetStats } from "@/lib/api";

export type ArtworkView = "active" | "archived";

type AssetStatsContextValue = {
  stats: AssetStats | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  /** Which artwork list (active or archived) the dashboard is showing. */
  view: ArtworkView;
  setView: (view: ArtworkView) => void;
  /** Switch the list and scroll it into view (used by the stat tiles). */
  showArtworks: (view: ArtworkView) => void;
};

const AssetStatsContext = createContext<AssetStatsContextValue | null>(null);

export function useAssetStats(): AssetStatsContextValue {
  const context = useContext(AssetStatsContext);

  if (!context) {
    throw new Error("useAssetStats must be used inside AssetStatsProvider.");
  }

  return context;
}

export function AssetStatsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();

  const [stats, setStats] = useState<AssetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<ArtworkView>("active");

  const showArtworks = useCallback((nextView: ArtworkView) => {
    setView(nextView);

    document
      .getElementById("artwork-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const activeRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    activeRequest.current?.abort();

    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setError("");

    try {
      const result = await api.assetStats(controller.signal);

      if (!controller.signal.aborted) {
        setStats(result);
      }
    } catch (err) {
      if (controller.signal.aborted) return;

      setStats(null);

      if (err instanceof ApiError && err.status === 401) {
        void logout();
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load asset totals. Check the API connection and retry.",
      );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }

      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [logout]);

  useEffect(() => {
    void refresh();

    return () => activeRequest.current?.abort();
  }, [user.id, refresh]);

  return (
    <AssetStatsContext.Provider
      value={{
        stats,
        loading,
        error,
        refresh,
        view,
        setView,
        showArtworks,
      }}
    >
      {children}
    </AssetStatsContext.Provider>
  );
}