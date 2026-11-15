import Link from "next/link";

import { Wordmark } from "@/components/app/brand";
import { CookieSettingsLink } from "@/components/CookieSettingsLink";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

const GROUPS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Product",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/help", label: "Help" },
      { href: "/support", label: "Support" },
    ],
  },
  {
    title: "Made for",
    links: [
      { href: "/for/illustrators", label: "Illustrators" },
      { href: "/for/photographers", label: "Photographers" },
      { href: "/for/etsy-sellers", label: "Etsy sellers" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/guides", label: "Guides" },
      { href: "/blog", label: "Blog" },
      { href: "/guides/what-an-invisible-watermark-survives", label: "Watermark test results" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds", label: "Refunds" },
    ],
  },
];

/** Footer for every page: grouped links, contact address and cookie settings. */
export function SiteFooter() {
  const linkClass = "transition hover:text-[var(--primary)]";

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--tint)] px-4 text-[var(--text-muted)] sm:px-6">
      <div className="mx-auto max-w-[1200px] py-12 text-[13px]">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-[320px] leading-6">
              A web watcher for your artwork. You decide what to do; we never
              contact anyone for you.
            </p>
            {CONTACT_EMAIL && (
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className={`mt-4 inline-block font-mono text-[12px] ${linkClass}`}
              >
                {CONTACT_EMAIL}
              </a>
            )}
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4"
          >
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="label-caps text-[var(--text)]">{group.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] pt-6 text-[12px] sm:flex-row sm:items-center">
          <p>© 2026 {SITE_NAME}</p>
          <CookieSettingsLink className={linkClass} />
        </div>
      </div>
    </footer>
  );
}
