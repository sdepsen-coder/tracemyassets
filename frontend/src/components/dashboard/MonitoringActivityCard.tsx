export function MonitoringActivityCard() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#161b29] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_14px_40px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-100">
            Monitoring Activity (Last 7 Days)
          </h3>
          <p className="mt-1 text-[12px] text-slate-400">
            12,482 pages scanned across 38 platform engines · 23 potential leads filtered
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="h-3 w-3 rounded-sm bg-sky-400" />
          Scan Volume
          <span className="ml-2 h-3 w-3 rounded-sm bg-cyan-300" />
          Detections
        </div>
      </div>

      <div className="mt-5 h-56 rounded-2xl border border-white/5 bg-[#090e1b] p-4">
        <svg className="h-full w-full" viewBox="0 0 700 160" fill="none" preserveAspectRatio="none">
          <defs>
            <linearGradient id="scanGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line x1="0" x2="700" y1="30" y2="30" stroke="#303443" strokeDasharray="3 3" opacity="0.5" />
          <line x1="0" x2="700" y1="80" y2="80" stroke="#303443" strokeDasharray="3 3" opacity="0.5" />
          <line x1="0" x2="700" y1="130" y2="130" stroke="#303443" strokeDasharray="3 3" opacity="0.5" />

          <path
            d="M 0 130 Q 100 90, 200 110 T 400 60 T 550 40 T 700 70 L 700 160 L 0 160 Z"
            fill="url(#scanGradient)"
          />
          <path
            d="M 0 130 Q 100 90, 200 110 T 400 60 T 550 40 T 700 70"
            stroke="#4cd7f6"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          <circle cx="550" cy="40" r="5" fill="#4cd7f6" />
          <circle cx="550" cy="40" r="10" stroke="#4cd7f6" strokeWidth="1.5" opacity="0.6" />
        </svg>

        <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span className="font-bold text-sky-300">Fri (Peak)</span>
          <span>Sat</span>
          <span>Sun (Today)</span>
        </div>
      </div>
    </div>
  );
}