import { Icon } from "@/components/dashboard/Icon";

type AssetRowProps = {
  title: string;
  meta: string;
  tags: string[];
  match: string;
  status: string;
  statusTone: string;
  badgeTone: string;
  thumbnail: string;
  alert: boolean;
};

export function AssetRow({
  title,
  meta,
  tags,
  match,
  status,
  statusTone,
  badgeTone,
  thumbnail,
  alert,
}: AssetRowProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#1a1f2d] p-4 transition hover:bg-[#252a38] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-[#303443] shadow-md">
          <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-[15px] font-semibold text-slate-100">{title}</h4>
            {alert && (
              <span className="h-2 w-2 rounded-full bg-rose-300 shadow-[0_0_8px_rgba(248,113,113,0.75)]" />
            )}
          </div>
          <p className="truncate text-[12px] leading-5 text-slate-400">{meta}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                  tag === "Protected"
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-white/8 text-slate-200"
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 sm:items-end">
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeTone}`}>
          {match}
        </span>
        <span className={`text-[12px] font-semibold ${statusTone}`}>{status}</span>
        <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-sky-300 hover:text-sky-200">
          Review Matches <Icon name="chevron_right" />
        </button>
      </div>
    </div>
  );
}