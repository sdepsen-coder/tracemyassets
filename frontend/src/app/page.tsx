import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProtectedAssetsCard } from "@/components/dashboard/ProtectedAssetsCard";
import { MonitoringActivityCard } from "@/components/dashboard/MonitoringActivityCard";
import { EvidenceInspectionCard } from "@/components/dashboard/EvidenceInspectionCard";
import { PipelineCard } from "@/components/dashboard/PipelineCard";
import { RecentEventsCard } from "@/components/dashboard/RecentEventsCard";
import { dashboardStats } from "@/lib/dashboard-mock";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0e1320] text-[#dee2f5]">
      <Sidebar />

      <div className="xl:pl-72">
        <Topbar />

        <main className="px-4 py-6 sm:px-6 xl:px-8">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6">
            <HeroBanner />

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dashboardStats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="flex flex-col gap-6 xl:col-span-7">
                <ProtectedAssetsCard />
                <MonitoringActivityCard />
              </div>

              <div className="flex flex-col gap-6 xl:col-span-5">
                <EvidenceInspectionCard />
                <PipelineCard />
                <RecentEventsCard />
              </div>
            </section>
          </div>
        </main>
      </div>
    </main>
  );
}