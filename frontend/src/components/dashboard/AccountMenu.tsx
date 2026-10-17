"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth, useOptionalAuth } from "@/components/AuthGate";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { api } from "@/lib/api";

import { FeedbackDialog } from "./FeedbackDialog";

/** The round account icon and its menu (plan, credits, sign out). */
export function AccountMenu() {
  const { user, logout, logoutEverywhere } = useAuth();
  const email = user.email ?? "";
  const initial = email.trim().charAt(0).toUpperCase() || "U";

  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [menuCredits, setMenuCredits] = useState<number | null>(null);
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

  // The balance is read when the menu opens, so it is always current.
  useEffect(() => {
    if (!menuOpen) return;

    const controller = new AbortController();

    api
      .getCredits(controller.signal)
      .then((info) => setMenuCredits(info.balance))
      .catch(() => {
        /* The plan still shows without the balance. */
      });

    return () => controller.abort();
  }, [menuOpen]);

  return (
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
              <p
                data-testid="menu-plan"
                className="mt-1 text-[12px] text-[var(--text-muted)]"
              >
                <span className="rounded-md bg-[var(--primary-soft)] px-1.5 py-0.5 font-semibold text-[var(--primary)]">
                  {user.plan_type}
                </span>
                {menuCredits !== null
                  ? ` · ${menuCredits} Deep scan ${
                      menuCredits === 1 ? "credit" : "credits"
                    }`
                  : ""}
              </p>
            </div>

            <Link
              href="/account"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Account and plan
            </Link>

            <Link
              href="/help"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Help
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setFeedbackOpen(true);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
            >
              Send feedback
            </button>

            {user.is_admin && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
              >
                Staff
              </Link>
            )}

            <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] px-3 pt-2">
              <span className="text-[12px] text-[var(--text-muted)]">Theme</span>
              <ThemeToggle className="flex" />
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

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                logoutEverywhere();
              }}
              title="Ends your session in every browser and device, including this one."
              className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              Sign out of all devices
            </button>
          </div>
        )}

        <FeedbackDialog
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
        />
      </div>
  );
}

/** Same menu for public pages: renders nothing when nobody is signed in. */
export function LandingAccountMenu() {
  const auth = useOptionalAuth();

  if (!auth) return null;

  return <AccountMenu />;
}
