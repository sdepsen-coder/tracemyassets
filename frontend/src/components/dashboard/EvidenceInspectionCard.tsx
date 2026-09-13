import { Icon } from "@/components/dashboard/Icon";
import { Panel } from "@/components/ui/Panel";

export function EvidenceInspectionCard() {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon name="crisis_alert" />
          <h3 className="text-[16px] font-semibold text-slate-100">
            Visual Evidence Inspection
          </h3>
        </div>

        <span className="rounded-full bg-sky-400/15 px-3 py-1 text-[11px] font-bold text-sky-300">
          2 Matches Pending
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-sky-400/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-300">
            Potential Unauthorized Use Detected
          </span>
          <span className="text-[11px] text-slate-400">12 min ago</span>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3">
        {/* Original */}
        <div className="space-y-2">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-[#090e1b]">
            <img
              src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=80"
              alt="Original creative asset"
              className="h-full w-full object-cover"
            />
            <div className="absolute left-2 top-2 rounded bg-[#090e1b]/85 px-2 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-sm">
              ORIGINAL
            </div>
          </div>
          <p className="truncate text-[12px] text-slate-400">Source: Abstract Wave #04</p>
        </div>

        {/* Suspected Copy */}
        <div className="space-y-2">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-[#090e1b]">
            <img
              src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=80"
              alt="Suspected copy"
              className="h-full w-full object-cover contrast-125 brightness-90"
            />

            {/* Fake watermark overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,transparent_42%,rgba(255,255,255,0.05)_43%,rgba(255,255,255,0.05)_47%,transparent_48%,transparent_100%)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rotate-[-18deg] rounded-lg border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-white/70 backdrop-blur-sm">
                TraceMyAssets
              </div>
            </div>

            <div className="absolute right-2 top-2 rounded bg-rose-500/90 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              SUSPECTED COPY
            </div>
          </div>
          <p className="truncate text-[12px] text-rose-300">Shopify: AestheticPrintsCo</p>
        </div>

        {/* Match Badge */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#090e1b] px-3 py-1 text-[12px] font-bold text-sky-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          98%
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#1a1f2d] p-4">
        <div className="space-y-2 text-[12px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Host Platform:</span>
            <span className="font-medium text-slate-100">Shopify Storefront (Custom domain)</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Listing Title:</span>
            <span className="max-w-[220px] truncate font-medium text-slate-100">
              &quot;Neon Flow Abstract Canvas&quot;
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-400">Price / Commercial:</span>
            <span className="font-semibold text-sky-300">$34.99 USD (Active Cart)</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              Watermark Matched
            </span>
            <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              Perceptual Hash Δ=2
            </span>
            <span className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-300">
              Metadata Removed
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button className="flex-1 rounded-xl bg-[#4cd7f6] px-4 py-3 text-[14px] font-bold text-[#003640] transition hover:brightness-110">
          Review &amp; Takedown
        </button>
        <button className="rounded-xl bg-[#252a38] px-4 py-3 text-[14px] font-medium text-slate-300 transition hover:bg-[#303443]">
          Dismiss
        </button>
      </div>
    </Panel>
  );
}