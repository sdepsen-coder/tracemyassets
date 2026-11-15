import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Page not found — TraceMyAssets",
  robots: { index: false },
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/guides", label: "Guides" },
  { href: "/blog", label: "Blog" },
  { href: "/help", label: "Help" },
  { href: "/support", label: "Support" },
];

/** Shown for any address that does not exist, with the site's own menu. */
export default function NotFound() {
  return (
    <LegalPage title="Page not found">
      <p className="max-w-xl text-[17px] leading-8 text-[var(--text-muted)]">
        <span className="font-mono text-[var(--primary)]">404</span> · There is
        nothing at this address. It may have moved, or the link may be
        mistyped.
      </p>

      <ul className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex h-11 items-center rounded-xl border border-[var(--line-strong)] px-5 text-[14px] font-semibold transition hover:border-[var(--border-glow)] hover:text-[var(--primary)]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
