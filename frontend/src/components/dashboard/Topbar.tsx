import { Icon } from "./Icon";

export function Topbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0e1320]/85 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-100 sm:text-[22px]">
            Good afternoon, Alex
          </h1>
          <p className="text-[12px] text-slate-400 sm:text-[14px]">
            Here&apos;s what&apos;s happening with your protected assets.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden items-center md:flex">
            <Icon name="search" />
            <input
              className="h-10 w-80 rounded-xl border border-white/8 bg-[#090e1b] pl-10 pr-12 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-400/80 focus:ring-2 focus:ring-sky-400/10"
              placeholder="Search protected assets, DMCA claims..."
            />
            <div className="absolute right-2 rounded-md bg-[#1a1f2d] px-2 py-0.5 text-[11px] font-semibold text-slate-400">
              ⌘K
            </div>
          </div>

          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#161b29] text-slate-300 transition hover:bg-[#252a38] hover:text-slate-100">
            <Icon name="notifications" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(248,113,113,0.75)]" />
          </button>

          <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4cd7f6] px-4 text-[14px] font-semibold text-[#003640] shadow-[0_4px_20px_rgba(6,182,212,0.22)] transition hover:brightness-110">
            <Icon name="cloud_upload" />
            <span className="hidden sm:inline">Upload Asset</span>
          </button>

          <button className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-300 text-[#003640]">
            <Icon name="person" />
          </button>
        </div>
      </div>
    </header>
  );
}
