import type { Metadata } from "next";
import type { ReactNode } from "react";

// Signed-in or one-time-link pages: keep them out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return children;
}
