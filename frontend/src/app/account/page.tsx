"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGate, useAuth } from "@/components/AuthGate";
import { Topbar } from "@/components/dashboard/Topbar";
import { SiteFooter } from "@/components/SiteFooter";
import { api, ApiError, type BillingConfig, type BillingStatus } from "@/lib/api";
import { CONTACT_EMAIL } from "@/lib/site";

function formatDay(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SubscriptionSection({ planType }: { planType: string }) {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    const justPaid =
      new URLSearchParams(window.location.search).get("checkout") ===
      "success";
    let tries = 0;

    async function load() {
      try {
        const [cfg, current] = await Promise.all([
          api.billingConfig(),
          api.billingStatus(),
        ]);

        if (stopped) return;
        setConfig(cfg);
        setStatus(current);

        if (!justPaid) return;

        if (current.subscription) {
          setWaiting(false);

          // The plan name in the header is read once; refresh it.
          if (current.plan_type !== planType) window.location.replace("/account");
          return;
        }

        // The payment is confirmed by Paddle a few seconds later.
        setWaiting(true);
        tries += 1;
        if (tries < 15) window.setTimeout(() => void load(), 2000);
        else setWaiting(false);
      } catch {
        /* The section just stays quiet. */
      }
    }

    void load();

    return () => {
      stopped = true;
    };
  }, [planType]);

  async function manage() {
    setBusy(true);
    setError("");

    try {
      const { url } = await api.billingPortal();
      window.location.assign(url);
    } catch {
      setError("The billing page could not be opened. Please try again.");
      setBusy(false);
    }
  }

  const subscription = status?.subscription ?? null;

  if (!subscription && !waiting && !config?.enabled) return null;

  return (
    <section
      data-testid="subscription-section"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card"
    >
      <h2 className="text-lg font-semibold">Subscription</h2>

      {waiting ? (
        <p
          data-testid="subscription-waiting"
          className="mt-2 text-[14px] text-[var(--text-muted)]"
        >
          Thank you. We are activating your plan. This usually takes a few
          seconds.
        </p>
      ) : subscription ? (
        <div className="mt-2 space-y-2 text-[14px] text-[var(--text-muted)]">
          <p data-testid="subscription-summary">
            <strong className="text-[var(--text)]">
              {subscription.plan}
            </strong>
            {subscription.interval === "year" ? " · yearly" : " · monthly"}
            {subscription.cancels_on
              ? ` · ends on ${formatDay(subscription.cancels_on)}`
              : subscription.renews_on
                ? ` · renews on ${formatDay(subscription.renews_on)}`
                : ""}
          </p>

          {subscription.payment_problem ? (
            <p
              role="alert"
              data-testid="subscription-payment-problem"
              className="text-[var(--danger)]"
            >
              The last payment did not go through. Please update your card so
              your plan is not interrupted.
            </p>
          ) : null}

          <button
            type="button"
            data-testid="manage-subscription"
            disabled={busy}
            onClick={() => void manage()}
            className="inline-flex h-10 items-center rounded-lg border border-[var(--border)] px-4 text-[13px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
          >
            {busy ? "Opening..." : "Manage subscription"}
          </button>
          <p className="text-[12px]">
            Change your card, see invoices or cancel. A cancelled plan stays
            active until the end of the period you paid for.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          You are on the Free plan.{" "}
          <Link href="/pricing" className="text-[var(--primary)] underline">
            See Pro and Extra
          </Link>
          .
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function DownloadSection() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setBusy(true);
    setError("");

    try {
      const blob = await api.downloadMyData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "tracemyassets-my-data.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The download did not work.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Download your data</h2>
      <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-muted)]">
        A ZIP file with everything we hold about your account: your account
        details, artworks (with your original files and protected copies),
        scan history, matches, credits, feedback you sent and the activity
        log. Passwords are never included.
      </p>

      <button
        type="button"
        data-testid="download-data"
        disabled={busy}
        onClick={() => void download()}
        className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--primary-strong)] px-4 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Preparing your file..." : "Download my data"}
      </button>

      {error ? (
        <p role="alert" className="mt-3 text-[13px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function DeleteSection({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsGoogle, setNeedsGoogle] = useState(false);

  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  async function remove() {
    setBusy(true);
    setError("");
    setNeedsGoogle(false);

    try {
      await api.deleteMyAccount(typed.trim(), password);
      window.location.assign("/?account_deleted=1");
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 403 &&
        err.message === "reauth_required"
      ) {
        setNeedsGoogle(true);
      } else {
        setError(
          err instanceof Error ? err.message : "The account was not deleted.",
        );
      }

      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--surface)] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[var(--danger)]">
        Delete your account
      </h2>

      <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-muted)]">
        This permanently deletes your account, all your artworks and their
        files, scan history, matches, credits and feedback. It cannot be
        undone, and unused credits are lost. An active subscription is
        cancelled immediately (no refund for the current period unless the
        Refund Policy applies). Download your data first if you want a copy.
      </p>

      {isAdmin ? (
        <p className="mt-4 text-[13px] text-[var(--text-muted)]">
          Administrator accounts cannot be deleted here.
        </p>
      ) : (
        <div className="mt-4 max-w-md space-y-3">
          <label className="block text-[13px]">
            <span className="text-[var(--text-muted)]">
              Type your email address ({email}) to confirm
            </span>
            <input
              type="email"
              autoComplete="off"
              data-testid="delete-confirm-email"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[14px]"
            />
          </label>

          <label className="block text-[13px]">
            <span className="text-[var(--text-muted)]">
              Your password (leave empty if you only sign in with Google)
            </span>
            <input
              type="password"
              autoComplete="current-password"
              data-testid="delete-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-[14px]"
            />
          </label>

          <button
            type="button"
            data-testid="delete-account"
            disabled={!matches || busy}
            onClick={() => void remove()}
            className="inline-flex h-10 items-center rounded-lg bg-[var(--danger)] px-4 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Deleting..." : "Delete my account permanently"}
          </button>

          {needsGoogle ? (
            <p
              role="alert"
              data-testid="delete-needs-google"
              className="text-[13px] leading-5 text-[var(--text)]"
            >
              To make sure it is really you, please{" "}
              <a
                href="/api/v1/auth/google/start"
                className="font-semibold text-[var(--primary)] underline"
              >
                sign in with Google again
              </a>
              , then come back to this page (Account, in the menu) and delete
              within 30 minutes.
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-[13px] text-[var(--danger)]">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function AccountContent() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
      <Topbar />

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <header>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="mt-1 text-[14px] text-[var(--text-muted)]">
            Signed in as <strong>{user.email}</strong> · {user.plan_type} plan
          </p>
        </header>

        <SubscriptionSection planType={user.plan_type} />
        <DownloadSection />
        <DeleteSection email={user.email} isAdmin={Boolean(user.is_admin)} />

        {CONTACT_EMAIL ? (
          <p className="text-[13px] text-[var(--text-muted)]">
            Need something else? Write to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[var(--primary)] underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGate>
      <AccountContent />
    </AuthGate>
  );
}
