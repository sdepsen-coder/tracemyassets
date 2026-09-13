import { Icon } from "@/components/dashboard/Icon";
import { Panel } from "@/components/ui/Panel";

export function PipelineCard() {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon name="shield" />
          <h3 className="text-[16px] font-semibold text-slate-100">
            DMCA Action Pipeline
          </h3>
        </div>

        <span className="text-[11px] font-semibold text-sky-300">
          Case #TX-8821
        </span>
      </div>

      <div className="relative mt-5 flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-[#003824]">
            <Icon name="check" />
          </div>
          <span className="text-[11px] font-semibold text-slate-100">Detected</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-300 text-[#003640] shadow-[0_0_12px_rgba(76,215,246,0.45)]">
            2
          </div>
          <span className="text-[11px] font-bold text-sky-300">Verified</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#252a38] text-slate-500">
            3
          </div>
          <span className="text-[11px] text-slate-500">Notice Sent</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#252a38] text-slate-500">
            4
          </div>
          <span className="text-[11px] text-slate-500">Resolved</span>
        </div>

        <div className="absolute left-6 right-6 top-5 -z-0 h-0.5 bg-[#303443]">
          <div className="h-full w-1/3 bg-sky-300" />
        </div>
      </div>

      <p className="mt-4 text-[13px] leading-6 text-slate-300">
        Cryptographic evidentiary packet compiled. Automated reverse lookup identified host registrar:
        Cloudflare CDN &amp; Shopify Trust &amp; Safety.
      </p>

      <button className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-[#252a38] text-[14px] font-semibold text-sky-300 transition hover:bg-[#303443]">
        <Icon name="description" />
        Generate 1-Click DMCA Notice
      </button>
    </Panel>
  );
}