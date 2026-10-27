import type { ReactNode } from "react";

import { Wordmark } from "@/components/app/brand";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";

/**
 * Page frame for the guides: same header and footer as the legal pages, with
 * a wider column so a guide can have a contents list beside the text.
 */
export function GuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="glass mx-auto flex h-16 max-w-[1200px] items-center justify-between rounded-2xl border border-[var(--border)] px-4 shadow-[0_10px_40px_rgb(0_0_0/0.05)] sm:px-5">
          <Wordmark />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
            <Link
              href="/pricing"
              className="inline-flex h-10 items-center rounded-full px-3 text-[13px] transition hover:bg-[var(--surface-muted)] sm:px-4"
            >
              Pricing
            </Link>
            <Link
              href="/guides"
              className="inline-flex h-10 items-center rounded-full bg-[var(--surface-muted)] px-3 text-[13px] sm:px-4"
            >
              Guides
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-full border border-[var(--line-strong)] px-4 text-[11px] font-medium uppercase tracking-[0.08em] transition hover:bg-[var(--surface-muted)] sm:px-5"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
