import { Icon } from "./Icon";

type StatCardProps = {
  label: string;
  value: string;
  sublabel: string;
  tone: string;
  chipClass: string;
  icon: string;
  spark: string | null;
};

export function StatCard({
  label,
  value,
  sublabel,
  tone,
  chipClass,
  icon,
  spark,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#161b29] p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>
          <div className={`text-[32px] font-bold tracking-[-0.02em] ${tone}`}>{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-sky-300">
          <Icon name={icon} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${chipClass}`}>
          <Icon name="trending_up" />
          {sublabel}
        </span>

        {spark ? (
          <svg className="h-6 w-20 text-emerald-300" fill="none" viewBox="0 0 80 24" stroke="currentColor" strokeWidth="2">
            <path d={spark} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="text-[11px] font-medium text-slate-400">High fidelity</span>
        )}
      </div>
    </div>
  );
}