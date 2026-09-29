import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SITE_NAME } from "@/lib/site";

type LegalPageProps = {
  title: string;
  updated?: string;
  children: ReactNode;
};

/**
 * Shared shell for the public Privacy / Terms / Support pages. These pages
 * are deliberately reachable without signing in (no AuthGate).
 */
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-heading text-[18px] font-semibold tracking-[-0.03em]"
          >
            {SITE_NAME}
          </Link>

          <Link
            href="/"
            className="text-[13px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em]">
          {title}
        </h1>

        {updated && (
          <p className="mt-2 text-[13px] text-[var(--text-muted)]">
            Last updated: {updated}
          </p>
        )}

        <div className="mt-8 space-y-8">{children}</div>
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
  return (
    <section>
      <h2 className="text-lg font-semibold">{heading}</h2>
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
