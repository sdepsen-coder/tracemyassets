import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";
import { LandingPage } from "@/components/landing/LandingPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description: `What ${SITE_NAME} does and how it works.`,
  // This page shows the same content as the home page, so the home page is
  // the one address search engines should keep.
  alternates: { canonical: "/" },
};

/**
 * The landing page, reachable at any time: signed out it is the same page
 * as the home page; signed in, its sign-up buttons turn into "Open
 * dashboard".
 */
export default function AboutPage() {
  return (
    <AuthGate landing={<LandingPage />}>
      <LandingPage />
    </AuthGate>
  );
}
