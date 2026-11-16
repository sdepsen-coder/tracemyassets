import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/app/brand";
import { HeaderAuthActions } from "@/components/HeaderAuthActions";
import { MobileMenu } from "@/components/MobileMenu";
import { NAV_LINKS, type NavKey } from "@/lib/nav";

/**
 * Top bar for every public page: the same links everywhere, and on phones a
 * menu button that opens them (they used to be reachable only from the
 * footer). `actions` replaces the default "Start free" link, for the landing
 * page whose buttons open the sign-in form in place.
 */
export function SiteHeader({
  active,
  actions,
  mobileSignIn,
}: {
  active?: NavKey;
  actions?: ReactNode;
  /** Sign-in entry for the phone menu; defaults to a link to the form. */
  mobileSignIn?: ReactNode;
}) {
  return (
    <header className="glass-nav sticky top-0 z-40 border-b border-[var(--border)] px-4 sm:px-6">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3">
        <Wordmark />

        <nav
          aria-label="Main"
          className="hidden items-center gap-1 text-[14px] text-[var(--text-muted)] lg:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={[
                "inline-flex h-9 items-center rounded-lg px-3.5 font-medium transition hover:text-[var(--primary)]",
                active === link.key
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "",
              ].join(" ")}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {actions ?? <HeaderAuthActions />}
          <MobileMenu active={active} signIn={mobileSignIn} />
        </div>
      </div>
    </header>
  );
}
