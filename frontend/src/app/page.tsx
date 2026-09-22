import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { AssetStatsProvider } from "@/components/dashboard/AssetStatsProvider";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
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

              <DashboardStats />

              <section id="my-artworks">
                <ProtectedAssetsCard />
              </section>

              <section
                id="check-image"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                      Image verification
                    </p>

                    <h2 className="mt-1 font-heading text-[22px] font-semibold tracking-[-0.02em] text-[var(--text)]">
                      Check a suspicious image
                    </h2>

                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-muted)]">
                      Select one of your registered artworks, then upload a
                      candidate image to review watermark verification and
                      visual similarity signals.
                    </p>
                  </div>

<Link
  href="/check"
  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--primary-strong)] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110"
>
  Check an image
  <span className="material-symbols-outlined text-[18px]">
    arrow_forward
  </span>
</Link>
                </div>
              </section>
            </div>
          </main>

          <Footer />
        </div>
      </AssetStatsProvider>
    </AuthGate>
  );
}