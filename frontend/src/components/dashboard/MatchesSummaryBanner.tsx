"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import { Icon } from "@/components/dashboard/Icon";
import { api } from "@/lib/api";

export function MatchesSummaryBanner() {
  const { user } = useAuth();

  const [newCount, setNewCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const summary = await api.getMatchSummary(controller.signal);

        if (!controller.signal.aborted) {
          setNewCount(summary.new);
        }
      } catch {
        // Non-critical: simply hide the banner if this fails.
      }
    }

    void loadSummary();

    return () => controller.abort();
  }, [user.id]);

  if (!newCount) {
    return null;
  }

  return (
    <Link
      href="/matches"
      className="flex flex-col gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-5 transition hover:brightness-105 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-strong)] text-white">
          <Icon name="notifications_active" />
        </div>

        <div>
          <p className="font-heading text-[16px] font-semibold text-[var(--text)]">
            {newCount === 1
              ? "1 new match needs your review"
              : `${newCount} new matches need your review`}
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            Possible copies of your protected artwork were found during a
            scan.
          </p>
        </div>
      </div>

      <span className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-lg bg-[var(--primary-strong)] px-4 text-[13px] font-semibold text-white sm:self-auto">
        Review now
        <span className="material-symbols-outlined text-[18px]">
          arrow_forward
        </span>
      </span>
    </Link>
  );
}
