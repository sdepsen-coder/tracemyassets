import { AuthGate } from "@/components/AuthGate";
import { AssetStatsProvider } from "@/components/dashboard/AssetStatsProvider";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { MatchesSummaryBanner } from "@/components/dashboard/MatchesSummaryBanner";
import { ProtectedAssetsCard } from "@/components/dashboard/ProtectedAssetsCard";
import { Topbar } from "@/components/dashboard/Topbar";
import { SiteFooter } from "@/components/SiteFooter";

export default function HomePage() {
  return (
    <AuthGate>
      <AssetStatsProvider>
        <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
          <Topbar />

          <main className="px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
              <HeroBanner />

              <MatchesSummaryBanner />

              <DashboardStats />

              <section id="my-artworks">
                <ProtectedAssetsCard />
              </section>
            </div>
          </main>

          <div className="mt-10">
            <SiteFooter />
          </div>
        </div>
      </AssetStatsProvider>
    </AuthGate>
  );
}