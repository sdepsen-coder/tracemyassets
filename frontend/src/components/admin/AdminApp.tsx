"use client";

import { useEffect, useState } from "react";

import { Topbar } from "@/components/dashboard/Topbar";
import { SiteFooter } from "@/components/SiteFooter";
import { api, ApiError } from "@/lib/api";
import { ActivityTab } from "./ActivityTab";
import { FeedbackTab } from "./FeedbackTab";
import { OverviewTab } from "./OverviewTab";
import { UsersTab } from "./UsersTab";

type TabId = "overview" | "users" | "feedback" | "activity";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "feedback", label: "Feedback" },
  { id: "activity", label: "Activity" },
];

type Access = "checking" | "granted" | "google" | "denied" | "error";

export function AdminApp() {
  const [access, setAccess] = useState<Access>("checking");
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    const controller = new AbortController();

    api.admin
      .me(controller.signal)
      .then(() => setAccess("granted"))
      .catch((err) => {
        if (controller.signal.aborted) return;

        if (err instanceof ApiError && err.status === 404) {
          setAccess("denied");
        } else if (
          err instanceof ApiError &&
          err.status === 403 &&
          err.message === "admin_google_signin_required"
        ) {
          setAccess("google");
        } else {
          setAccess("error");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
      <Topbar />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6 lg:px-12">
        {access === "checking" && <p>Checking access…</p>}

        {access === "denied" && (
          <div className="py-16 text-center">
            <h1 className="font-heading text-3xl font-bold">Page not found</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              This page does not exist.
            </p>
          </div>
        )}

        {access === "error" && (
          <p role="alert">
            The admin area could not be loaded. Please try again.
          </p>
        )}

        {access === "google" && (
          <div className="mx-auto max-w-md py-16 text-center">
            <h1 className="font-heading text-2xl font-bold">
              Sign in with Google to continue
            </h1>
            <p className="mt-2 text-[14px] text-[var(--text-muted)]">
              The admin area needs a recent Google sign-in (and 2-step
              verification on your Google account). This keeps it safe even
              if your password leaks.
            </p>
            <a
              href="/api/v1/auth/google/start"
              className="mt-6 inline-block rounded-xl bg-[var(--primary-strong)] px-5 py-2.5 text-[14px] font-semibold text-white"
            >
              Continue with Google
            </a>
          </div>
        )}

        {access === "granted" && (
          <>
            <header className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                Admin
              </p>
              <h1 className="mt-1 font-heading text-3xl font-bold tracking-[-0.03em]">
                Control panel
              </h1>
            </header>

            <div
              role="tablist"
              aria-label="Admin sections"
              className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--border)]"
            >
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={[
                    "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[14px] font-medium transition",
                    tab === item.id
                      ? "border-[var(--primary-strong)] text-[var(--primary)]"
                      : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "overview" && <OverviewTab />}
            {tab === "users" && <UsersTab />}
            {tab === "feedback" && <FeedbackTab />}
            {tab === "activity" && <ActivityTab />}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
