import type { Metadata } from "next";
import type { ReactNode } from "react";

// A signed-in page: keep it out of search results.
export const metadata: Metadata = {
  title: "Account — TraceMyAssets",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return children;
}
