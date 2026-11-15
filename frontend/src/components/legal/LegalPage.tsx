import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { NavKey } from "@/lib/nav";

type LegalPageProps = {
  title: string;
  updated?: string;
  /** Wider column, for pages with cards side by side. */
  wide?: boolean;
  /** Which menu item to highlight. */
  active?: NavKey;
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
  active,
  children,
}: LegalPageProps) {
  const width = wide ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className="flex min-h-screen flex-col text-[var(--text)]">
      <SiteHeader active={active} />

      <main id="main-content" className={`mx-auto w-full ${width} flex-1 px-4 pb-20 pt-14 sm:px-6 sm:pt-20`}>
        <h1 className="font-heading text-[38px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[54px]">
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
        className="scroll-mt-28 font-heading text-[24px] font-semibold tracking-[-0.02em]"
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
