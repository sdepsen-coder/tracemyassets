"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/app/brand";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { useAuth } from "@/components/AuthGate";
import { api, type MatchSummary } from "@/lib/api";
import { Icon } from "./Icon";
import { VerifyEmailBanner } from "./VerifyEmailBanner";

type NavItem = {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  showsMatchCount?: boolean;
};

// The signed-in app has three places; everything else lives in the
// account menu. "Monitoring" is the home page of a signed-in user.
const NAV_ITEMS: NavItem[] = [
  {
    label: "Monitoring",
    href: "/",
    isActive: (pathname) => pathname === "/",
  },
  {
    label: "Matches",
    href: "/matches",
    isActive: (pathname) => pathname.startsWith("/matches"),
    showsMatchCount: true,
  },
  {
    label: "Check an image",
    href: "/check",
    isActive: (pathname) => pathname.startsWith("/check"),
  },
];

function MatchCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="iris ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium text-[#111111]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Topbar() {
  const { user } = useAuth();
  const pathname = usePathname() ?? "/";

  const [newMatchCount, setNewMatchCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const summary: MatchSummary = await api.getMatchSummary(
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setNewMatchCount(summary.new + summary.reviewing);
        }
      } catch {
        // Non-critical: the badge simply shows no count if this fails.
      }
    }

    void loadSummary();

    return () => controller.abort();
  }, [user.id, pathname]);

  const matchLabel =
    newMatchCount > 0
      ? `${newMatchCount} match${newMatchCount === 1 ? "" : "es"} to review`
      : "No matches to review";

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="glass mx-auto max-w-[1280px] rounded-2xl border border-[var(--border)] shadow-[0_10px_40px_rgb(0_0_0/0.05)]">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-6">
          <Wordmark />

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-[14px] transition",
                    active
                      ? "bg-[var(--surface-muted)] text-[var(--text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {item.label}
                  {item.showsMatchCount && (
                    <MatchCountBadge count={newMatchCount} />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/protect"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--primary-strong)] px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85 sm:px-5"
          >
            <Icon name="add" className="text-[18px]" />
            <span className="hidden sm:inline">Protect new artwork</span>
          </Link>

          <Link
            href="/matches"
            aria-label={matchLabel}
            title={matchLabel}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          >
            <Icon name="notifications" className="text-[22px]" />
            {newMatchCount > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]" />
            )}
          </Link>

          <AccountMenu />
        </div>
      </div>

      <VerifyEmailBanner />

      {/* On small screens the links above are hidden; the same three
          places are offered as a row of tabs. */}
      <nav
        aria-label="Primary navigation (compact)"
        className="border-t border-[var(--border)] lg:hidden"
      >
        <div className="grid grid-cols-3 px-2">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center justify-center border-b-2 px-2 py-2.5 text-[13px] transition",
                  active
                    ? "border-[var(--text)] text-[var(--text)]"
                    : "border-transparent text-[var(--text-muted)]",
                ].join(" ")}
              >
                {item.label}
                {item.showsMatchCount && (
                  <MatchCountBadge count={newMatchCount} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      </div>
    </header>
  );
}
