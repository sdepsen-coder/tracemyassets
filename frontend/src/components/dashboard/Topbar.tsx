"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/AuthGate";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { api, type MatchSummary } from "@/lib/api";
import { Icon } from "./Icon";

type NavItem = {
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
};

// Absolute hrefs ("/#...") so the in-page anchors also work from other
// pages (e.g. /matches), not only from the dashboard itself.
const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    isActive: (pathname) => pathname === "/",
  },
  {
    label: "My Artworks",
    href: "/#my-artworks",
    isActive: () => false,
  },
  {
    label: "Matches",
    href: "/matches",
    isActive: (pathname) => pathname.startsWith("/matches"),
  },
  {
    label: "Check an Image",
    href: "/check",
    isActive: (pathname) => pathname.startsWith("/check"),
  },
];

export function Topbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname() ?? "/";

  const [newMatchCount, setNewMatchCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const summary: MatchSummary = await api.getMatchSummary(
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setNewMatchCount(summary.new);
        }
      } catch {
        // Non-critical: the bell simply shows no count if this fails.
      }
    }

    void loadSummary();

    return () => controller.abort();
  }, [user.id]);

  const email = user.email ?? "";
  const initial = email.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--background)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-[var(--text)]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <Icon name="shield" />
            </div>

            <span className="hidden font-heading text-[18px] font-semibold tracking-[-0.03em] sm:block">
              TraceMyAssets
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-lg bg-[var(--surface-muted)] p-1 lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-md px-3 py-2 text-[12px] transition",
                    active
                      ? "bg-[var(--surface)] font-semibold text-[var(--primary)] shadow-sm hover:text-[var(--primary-strong)]"
                      : "font-medium text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/#asset-upload"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary-strong)] px-3 text-[13px] font-semibold text-white shadow-card transition hover:brightness-110 sm:px-4"
          >
            <Icon name="add" />
            <span className="hidden sm:inline">Upload artwork</span>
          </Link>

          <ThemeToggle />

          <Link
            href="/matches"
            aria-label={
              newMatchCount > 0
                ? `${newMatchCount} new match${newMatchCount === 1 ? "" : "es"} to review`
                : "No new matches"
            }
            title={
              newMatchCount > 0
                ? `${newMatchCount} new match${newMatchCount === 1 ? "" : "es"} to review`
                : "No new matches"
            }
            className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)] sm:flex"
          >
            <Icon name="notifications" />
            {newMatchCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary-strong)] px-1 text-[10px] font-bold text-white ring-2 ring-[var(--background)]">
                {newMatchCount > 9 ? "9+" : newMatchCount}
              </span>
            )}
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[13px] font-semibold text-[var(--primary)] transition hover:brightness-95"
            >
              {initial}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-card"
              >
                <div className="px-3 py-2">
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Signed in as
                  </p>
                  <p className="truncate text-[13px] font-semibold text-[var(--text)]">
                    {email}
                  </p>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="mt-1 w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Below the lg breakpoint the pill navigation above is hidden, so
          the same links are offered here as a scrollable row. */}
      <nav
        aria-label="Primary navigation (compact)"
        className="border-t border-[var(--border)] lg:hidden"
      >
        <div className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "shrink-0 rounded-md px-3 py-1.5 text-[12px] transition",
                  active
                    ? "bg-[var(--surface-muted)] font-semibold text-[var(--primary)]"
                    : "font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
