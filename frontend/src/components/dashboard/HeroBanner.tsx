export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#161b29] p-6 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_14px_40px_rgba(0,0,0,0.26)] sm:p-8">
      <div className="absolute -right-16 -top-16 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute bottom-[-5rem] right-1/3 h-64 w-64 rounded-full bg-emerald-400/5 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            <span>TraceMyAssets Radar</span>
            <span className="h-1 w-1 rounded-full bg-slate-500" />
            <span className="text-slate-400">Autonomous Protection v4.2</span>
          </div>
          <h2 className="text-[28px] font-bold tracking-[-0.025em] text-slate-100 sm:text-[40px]">
            Your assets are protected.
          </h2>
          <p className="mt-3 max-w-2xl text-[14px] leading-7 text-slate-300 sm:text-[16px]">
            TraceMyAssets continuously monitors the web and global marketplaces for unauthorized use,
            metadata stripping, and AI harvesting of your creative work.
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-[#090e1b] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <div>
                <div className="text-[13px] font-bold text-emerald-300">Monitoring active</div>
                <div className="text-[11px] text-slate-400">14 crawlers online</div>
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <div>
                <div className="text-[11px] text-slate-400">Last scan</div>
                <div className="text-[13px] font-semibold text-slate-100">4 min ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}