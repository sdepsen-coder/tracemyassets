import type { ReactNode } from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Page frame for the guides: same header and footer as the legal pages, with
 * a wider column so a guide can have a contents list beside the text.
 */
export function GuideShell({
  children,
  active,
}: {
  children: ReactNode;
  /** Which menu item to highlight. */
  active?: "guides" | "blog";
}) {
  return (
    <div className="flex min-h-screen flex-col text-[var(--text)]">
      <SiteHeader active={active} />

      <main id="main-content" className="w-full flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
