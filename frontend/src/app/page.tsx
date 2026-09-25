import { AuthGate } from "@/components/AuthGate";
import { AssetStatsProvider } from "@/components/dashboard/AssetStatsProvider";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { MatchesSummaryBanner } from "@/components/dashboard/MatchesSummaryBanner";
import { ProtectedAssetsCard } from "@/components/dashboard/ProtectedAssetsCard";
import { Topbar } from "@/components/dashboard/Topbar";

function Footer() {
  return (
    <footer className="mt-10 border-t border-[var(--border)] bg-[var(--surface-muted)]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 py-6 text-[12px] text-[var(--text-muted)] sm:flex-row sm:px-6 xl:px-8">
        <span>© 2026 TraceMyAssets</span>

        <div className="flex items-center gap-4">
          <a href="#privacy" className="transition hover:text-[var(--text)]">
            Privacy
          </a>
          <a href="#terms" className="transition hover:text-[var(--text)]">
            Terms
          </a>
          <a href="#support" className="transition hover:text-[var(--text)]">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}

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

          <Footer />
        </div>
      </AssetStatsProvider>
    </AuthGate>
  );
}