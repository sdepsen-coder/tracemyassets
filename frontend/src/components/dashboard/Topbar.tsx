"use client";

import { useAuth } from "@/components/AuthGate";
import { Icon } from "./Icon";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0e1320]/85 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-slate-100 sm:text-[22px]">
            Your asset dashboard
          </h1>
          <p className="truncate text-[12px] text-slate-400 sm:text-[14px]">
            {user.email}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative hidden items-center md:flex">
            <Icon name="search" />
            <input
              disabled
              aria-label="Search is not available yet"
              className="h-10 w-64 rounded-xl border border-white/8 bg-[#090e1b] pl-10 pr-3 text-[13px] text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Search coming soon"
            />
          </div>

          <button
            type="button"
            disabled
            aria-label="Notifications are not available yet"
            title="Notifications coming soon"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161b29] text-slate-500 disabled:cursor-not-allowed"
          >
            <Icon name="notifications" />
          </button>

          <a
            href="#asset-upload"
            aria-label="Go to asset upload"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4cd7f6] px-4 text-[14px] font-semibold text-[#003640] shadow-[0_4px_20px_rgba(6,182,212,0.22)] transition hover:brightness-110"
          >
            <Icon name="cloud_upload" />
            <span className="hidden sm:inline">Upload Asset</span>
          </a>

          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-300 text-[#003640]"
          >
            <Icon name="person" />
          </button>
        </div>
      </div>
    </header>
  );
}