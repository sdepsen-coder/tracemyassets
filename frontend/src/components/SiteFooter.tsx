import Link from "next/link";

import { Wordmark } from "@/components/app/brand";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

type SiteFooterProps = {
  /**
   * "themed" follows the app's light/dark CSS variables (dashboard and
   * public pages). "dark" is for the signed-out sign-in screen, which uses
   * fixed dark colours instead of the theme variables.
   */
  tone?: "themed" | "dark";
};

export function SiteFooter({ tone = "themed" }: SiteFooterProps) {
  const dark = tone === "dark";

  const wrapper = dark
    ? "border-t border-white/10 text-slate-400"
    : "border-t border-[var(--border)] text-[var(--text-muted)]";

  const linkClass = dark
    ? "transition hover:text-slate-100"
    : "transition hover:text-[var(--text)]";

  return (
    <footer className={wrapper}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 text-[13px] sm:px-6">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          {dark ? <span>© 2026 {SITE_NAME}</span> : <Wordmark />}

          <nav
            aria-label="Legal and support"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
          >
            <Link href="/about" className={linkClass}>
              About
            </Link>
            <Link href="/pricing" className={linkClass}>
              Pricing
            </Link>
            <Link href="/help" className={linkClass}>
              Help
            </Link>
            <Link href="/privacy" className={linkClass}>
              Privacy
            </Link>
            <Link href="/terms" className={linkClass}>
              Terms
            </Link>
            <Link href="/refunds" className={linkClass}>
              Refunds
            </Link>
            <Link href="/support" className={linkClass}>
              Support
            </Link>
            <CookieSettingsLink className={linkClass} />
            {/* The admin area under a quiet name; it signs in from there
                and stays "page not found" for everyone who is not an admin. */}
            <Link href="/admin" className={linkClass}>
              Staff
            </Link>
            {CONTACT_EMAIL && (
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
            )}
          </nav>
        </div>

        {!dark && (
          <p className="text-center text-[12px] sm:text-left">© 2026 {SITE_NAME}</p>
        )}
      </div>
    </footer>
  );
}
