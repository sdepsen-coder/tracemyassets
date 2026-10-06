import type { Metadata } from "next";
import type { ReactNode } from "react";

// The admin area is private: keep it out of search results.
export const metadata: Metadata = {
  title: "Admin — TraceMyAssets",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
