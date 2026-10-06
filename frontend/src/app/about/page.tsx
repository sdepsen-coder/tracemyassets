import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";
import { LandingPage } from "@/components/landing/LandingPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description: `What ${SITE_NAME} does and how it works.`,
  alternates: { canonical: "/about" },
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
