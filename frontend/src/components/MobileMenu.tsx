"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

import { Icon } from "@/components/dashboard/Icon";
import { NAV_LINKS, type NavKey } from "@/lib/nav";

/**
 * Phone and tablet menu for the public top bar: a button that opens the page
 * links in a panel under the bar. Closes on Escape, on a link and when the
 * window grows to the desktop layout.
 */
export function MobileMenu({
  active,
  signIn,
}: {
  active?: NavKey;
  signIn?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => {
      if (desktop.matches) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);

    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  const linkClass =
    "flex h-12 items-center justify-between rounded-xl px-4 text-[15px] text-[var(--text)] transition hover:bg-[var(--surface-raised)]";

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text)] transition hover:border-[var(--border-glow)]"
      >
        <Icon name={open ? "close" : "menu"} className="text-[22px]" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full border-b border-[var(--border)] bg-[var(--background)] px-2 pb-5 pt-2 shadow-floating sm:px-4"
        >
          <nav aria-label="Main, phone" className="mx-auto max-w-[1200px]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                aria-current={active === link.key ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`${linkClass} ${active === link.key ? "text-[var(--primary)]" : ""}`}
              >
                {link.label}
                <Icon name="chevron_right" className="text-[20px] text-[var(--text-muted)]" />
              </Link>
            ))}
            <Link href="/about" onClick={() => setOpen(false)} className={linkClass}>
              About
              <Icon name="chevron_right" className="text-[20px] text-[var(--text-muted)]" />
            </Link>
            <div
              className="mt-3 border-t border-[var(--border)] pt-3"
              onClick={() => setOpen(false)}
            >
              {signIn ?? (
                <Link href="/?auth=login" className={linkClass}>
                  Sign in
                  <Icon name="chevron_right" className="text-[20px] text-[var(--text-muted)]" />
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
