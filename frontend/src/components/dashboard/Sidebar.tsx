import { Icon } from "./Icon";

const navCore = [
  { label: "Overview", icon: "radar", active: true, count: null },
  { label: "My Assets", icon: "folder_copy", active: false, count: "12" },
  { label: "Infringements", icon: "policy", active: false, count: "3" },
  { label: "Monitoring", icon: "track_changes", active: false, count: null },
  { label: "DMCA Cases", icon: "gavel", active: false, count: "1" },
  { label: "Reports", icon: "bar_chart", active: false, count: null },
];

const navPrefs = [
  { label: "Notifications", icon: "notifications" },
  { label: "Settings", icon: "settings" },
  { label: "Help & Support", icon: "help" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-white/5 bg-[#090e1b] xl:flex">
      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161b29] text-sky-300 shadow-[0_0_16px_rgba(76,215,246,0.12)]">
            <Icon name="shield" />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-slate-100">TraceMyAssets</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Radar Active
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="mb-4">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Core Navigation
          </div>
          <nav className="space-y-2">
            {navCore.map((item) => (
              <a
                key={item.label}
                href="#"
                className={[
                  "flex items-center justify-between rounded-xl px-4 py-3 transition",
                  item.active
                    ? "bg-[#252a38] text-sky-300 shadow-[inset_0_0_12px_rgba(76,215,246,0.07)]"
                    : "text-slate-300 hover:bg-[#252a38] hover:text-slate-100",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <Icon name={item.icon} />
                  <span className="text-[14px] font-medium">{item.label}</span>
                </div>

                {item.count ? (
                  <span className="rounded-full bg-[#1a1f2d] px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                    {item.count}
                  </span>
                ) : item.active ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.65)]" />
                ) : null}
              </a>
            ))}
          </nav>
        </div>

        <div className="mb-4">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Preferences
          </div>
          <nav className="space-y-2">
            {navPrefs.map((item) => (
              <a
                key={item.label}
                href="#"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-[#252a38] hover:text-slate-100"
              >
                <Icon name={item.icon} />
                <span className="text-[14px] font-medium">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="m-4 rounded-2xl border border-white/8 bg-[#161b29] p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-300 text-[#003640]">
              <Icon name="person" />
            </div>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold text-slate-100">Alex Vance</span>
              <span className="rounded bg-sky-300 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#003640]">
                Pro
              </span>
            </div>
            <p className="truncate text-[12px] text-slate-400">alex@studioforma.design</p>
          </div>
        </div>
      </div>
    </aside>
  );
}