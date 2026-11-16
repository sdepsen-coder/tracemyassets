"use client";

import Link from "next/link";

import { TrackedLink } from "@/components/guides/TrackedLink";
import { useSessionHint } from "@/lib/sessionHint";

const PRIMARY =
  "btn-glow inline-flex h-9 items-center whitespace-nowrap rounded-xl bg-[var(--primary-strong)] px-3.5 text-[13px] font-semibold text-[var(--on-primary)] transition sm:h-10 sm:px-5 sm:text-[14px]";

/**
 * Right-hand side of the public top bar on pages outside AuthGate (pricing,
 * guides, blog, help, legal). A signed-in visitor gets a link back to their
 * artworks instead of "Sign in" and "Start free".
 */
export function HeaderAuthActions() {
  const signedIn = useSessionHint();

  if (signedIn) {
    return (
      <Link href="/monitoring" data-testid="header-open-app" className={PRIMARY}>
        Open Monitoring
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/?auth=login"
        className="hidden h-10 items-center rounded-xl px-4 text-[14px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-raised)] sm:inline-flex"
      >
        Sign in
      </Link>
      <TrackedLink href="/?auth=register" placement="header" className={PRIMARY}>
        Start free
      </TrackedLink>
    </>
  );
}
