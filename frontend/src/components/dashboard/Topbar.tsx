"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthGate";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Icon } from "./Icon";

export function Topbar() {
  const { user, logout } = useAuth();

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
            <Link
              href="/"
              className="rounded-md bg-[var(--surface)] px-3 py-2 text-[12px] font-semibold text-[var(--primary)] shadow-sm transition hover:text-[var(--primary-strong)]"
            >
              Dashboard
            </Link>

            <a
              href="#my-artworks"
              className="rounded-md px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
            >
              My Artworks
            </a>

<Link
  href="/check"
  className="rounded-md px-3 py-2 text-[12px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
>
  Check an Image
</Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href="#asset-upload"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary-strong)] px-3 text-[13px] font-semibold text-white shadow-card transition hover:brightness-110 sm:px-4"
          >
            <Icon name="add" />
            <span className="hidden sm:inline">Upload artwork</span>
          </a>

          <ThemeToggle />

          <button
            type="button"
            disabled
            aria-label="Notifications are not available yet"
            title="Notifications coming soon"
            className="relative hidden h-10 w-10 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)] sm:flex"
          >
            <Icon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--primary-strong)] ring-2 ring-[var(--background)]" />
          </button>

          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title={`Signed in as ${email}. Click to sign out.`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[13px] font-semibold text-[var(--primary)] transition hover:brightness-95"
          >
            {initial}
          </button>
        </div>
      </div>
    </header>
  );
}