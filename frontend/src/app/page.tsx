import type { ReactNode } from "react";

import { AuthGate } from "@/components/AuthGate";
import { AssetStatsProvider } from "@/components/dashboard/AssetStatsProvider";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { ProtectedAssetsCard } from "@/components/dashboard/ProtectedAssetsCard";
import { MonitoringActivityCard } from "@/components/dashboard/MonitoringActivityCard";
import { EvidenceInspectionCard } from "@/components/dashboard/EvidenceInspectionCard";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { RecentEventsCard } from "@/components/dashboard/RecentEventsCard";

function DemoPreview({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Demo preview"
      className="overflow-hidden rounded-2xl border border-amber-300/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-300/5 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">
          Demo preview
        </span>
        <span className="text-[11px] text-slate-400">
          Sample content · Not connected
        </span>
      </div>

      {children}
    </section>
  );
}

export default function HomePage() {
  return (
    <AuthGate>
      <AssetStatsProvider>
        <div className="min-h-screen bg-[#0e1320] text-[#dee2f5]">
          <Sidebar />

          <div className="xl:pl-72">
            <Topbar />

            <main className="px-4 py-6 sm:px-6 xl:px-8">
              <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
                <HeroBanner />

                <DashboardStats />

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  <div className="flex flex-col gap-6 xl:col-span-7">
                    <ProtectedAssetsCard />

                    <DemoPreview>
                      <MonitoringActivityCard />
                    </DemoPreview>
                  </div>

                  <div className="flex flex-col gap-6 xl:col-span-5">
                    <DemoPreview>
                      <EvidenceInspectionCard />
                    </DemoPreview>

                    <DemoPreview>
                      <PipelineCard />
                    </DemoPreview>

                    <DemoPreview>
                      <RecentEventsCard />
                    </DemoPreview>
                  </div>
                </section>
              </div>
            </main>
          </div>
        </div>
      </AssetStatsProvider>
    </AuthGate>
  );
}