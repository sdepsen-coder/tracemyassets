import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/app/brand";
import { SiteFooter } from "@/components/SiteFooter";

type LegalPageProps = {
  title: string;
  updated?: string;
  /** Wider column, for pages with cards side by side. */
  wide?: boolean;
  children: ReactNode;
};

/**
 * Shared shell for the public Privacy / Terms / Support pages. These pages
 * are deliberately reachable without signing in (no AuthGate).
 */
export function LegalPage({
  title,
  updated,
  wide = false,
  children,
}: LegalPageProps) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="glass mx-auto flex h-16 max-w-[1200px] items-center justify-between rounded-2xl border border-[var(--border)] px-4 shadow-[0_10px_40px_rgb(0_0_0/0.05)] sm:px-5">
          <Wordmark />

          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full border border-[var(--line-strong)] px-5 text-[11px] font-medium uppercase tracking-[0.08em] transition hover:bg-[var(--surface-muted)]"
          >
            Home
          </Link>
        </div>
      </header>

      <main className={`mx-auto w-full ${width} flex-1 px-4 pb-20 pt-14 sm:px-6 sm:pt-20`}>
        <h1 className="font-heading text-[44px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
          {title}
        </h1>

        {updated && (
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">
            Last updated: {updated}
          </p>
        )}

        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  const id = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (
    <section>
      <h2
        id={id || undefined}
        className="scroll-mt-28 font-heading text-[26px] font-light tracking-[-0.02em]"
      >
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--text-muted)]">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
