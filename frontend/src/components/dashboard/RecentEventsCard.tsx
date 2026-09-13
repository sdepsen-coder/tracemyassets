import { Panel } from "@/components/ui/Panel";
import { dashboardEvents } from "@/lib/dashboard-mock";

export function RecentEventsCard() {
  return (
    <Panel className="p-5">
      <h3 className="text-[16px] font-semibold text-slate-100">Recent Radar Events</h3>

      <div className="mt-4 space-y-4">
        {dashboardEvents.map((event) => (
          <EventItem key={event.title} {...event} />
        ))}
      </div>
    </Panel>
  );
}

function EventItem({
  title,
  meta,
  tone,
}: {
  title: string;
  meta: string;
  tone: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone} shadow-[0_0_8px_rgba(56,189,248,0.45)]`}
      />
      <div className="min-w-0">
        <p className="text-[13px] leading-5 text-slate-100">{title}</p>
        <span className="text-[11px] text-slate-400">{meta}</span>
      </div>
    </div>
  );
}