import { AssetRow } from "@/components/dashboard/AssetRow";
import { Icon } from "@/components/dashboard/Icon";
import { Panel } from "@/components/ui/Panel";
import { dashboardAssets } from "@/lib/dashboard-mock";

export function ProtectedAssetsCard() {
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-100">
            Protected Assets
          </h3>
          <p className="mt-1 text-[12px] text-slate-400">
            Track registered creative files, hashes, and active scanner flags.
          </p>
        </div>

        <span className="rounded-full bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
          Demo data
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {dashboardAssets.map((asset) => (
          <AssetRow key={asset.title} {...asset} />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-400">
        <Icon name="info" />
        <span>
          Showing {dashboardAssets.length} sample assets. Live data is not
          connected yet.
        </span>
      </div>
    </Panel>
  );
}