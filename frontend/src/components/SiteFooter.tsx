import Link from "next/link";

import { CookieSettingsLink } from "@/components/CookieSettingsLink";
import {
  CONTACT_EMAIL,
  ETSY_TRADEMARK_NOTICE,
  SITE_NAME,
} from "@/lib/site";

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
    : "border-t border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]";

  const linkClass = dark
    ? "transition hover:text-slate-100"
    : "transition hover:text-[var(--text)]";

  return (
    <footer className={wrapper}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-6 text-[12px] sm:px-6 xl:px-8">
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <span>© 2026 {SITE_NAME}</span>

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
            <Link href="/support" className={linkClass}>
              Support
            </Link>
            <CookieSettingsLink className={linkClass} />
            {CONTACT_EMAIL && (
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
            )}
          </nav>
        </div>

        <p className="text-center leading-relaxed sm:text-left">
          {ETSY_TRADEMARK_NOTICE}
        </p>
      </div>
    </footer>
  );
}
