import type { Metadata } from "next";

import { AuthGate } from "@/components/AuthGate";
import { AssetStatsProvider } from "@/components/dashboard/AssetStatsProvider";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { MatchesSummaryBanner } from "@/components/dashboard/MatchesSummaryBanner";
import { ProtectedAssetsCard } from "@/components/dashboard/ProtectedAssetsCard";
import { Topbar } from "@/components/dashboard/Topbar";
import { LandingPage } from "@/components/landing/LandingPage";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <AuthGate landing={<LandingPage />}>
      <AssetStatsProvider>
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
          <Topbar />

          <main className="px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
              <HeroBanner />

              <DashboardStats />

              <section id="my-artworks" className="scroll-mt-32">
                <ProtectedAssetsCard />
              </section>

              <MatchesSummaryBanner />
            </div>
          </main>

          <div className="mt-10">
            <SiteFooter />
          </div>
        </div>
      </AssetStatsProvider>
      </AuthGate>
    </>
  );
}