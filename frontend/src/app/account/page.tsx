"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthGate, useAuth } from "@/components/AuthGate";
import { AppShell, PageTitle } from "@/components/app/ui";
import { CreditPacks } from "@/components/billing/CreditPacks";
import {
  api,
  ApiError,
  type AssetStats,
  type BillingConfig,
  type BillingStatus,
  type UsageInfo,
} from "@/lib/api";
import { CONTACT_EMAIL } from "@/lib/site";

// Artworks that can be on automatic scans, per plan (backend
// core/plan_limits.py, max_monitored_assets). Internal has no limit.
const ARTWORK_LIMITS: Record<string, number | null> = {
  Free: 3,
  Pro: 40,
  Extra: 100,
  Internal: null,
};

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

/** The server sends UTC; a time without a zone must not be read as local. */
function serverTime(value: string): number {
  const zoned = /(Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}Z`;

  return new Date(zoned.replace(" ", "T")).getTime();
}

function SubscriptionSection({ planType }: { planType: string }) {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
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

        api
          .getCredits()
          .then((info) => {
            if (!stopped) setCredits(info.balance);
          })
          .catch(() => {});

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
      className="glass rounded-card border border-[var(--border)] p-6 sm:p-7"
    >
      <h2 className="font-heading text-[24px] font-light tracking-[-0.02em]">Subscription</h2>

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

          {credits !== null ? (
            <p data-testid="subscription-credits">
              Deep scan credits:{" "}
              <strong className="text-[var(--text)]">{credits}</strong>. Your
              plan adds new credits each month; unused monthly credits do not
              carry over.
            </p>
          ) : null}

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
            className="inline-flex h-10 items-center rounded-full border border-[var(--line-strong)] px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
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
          You are on the Free plan
          {credits !== null ? ` with ${credits} Deep scan credits` : ""}.{" "}
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

function CreditsSection() {
  const [balance, setBalance] = useState<number | null>(null);
  const [packsOpen, setPacksOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let stopped = false;
    const justPaid =
      new URLSearchParams(window.location.search).get("credits") ===
      "success";
    let tries = 0;

    api
      .billingConfig()
      .then((cfg) => {
        if (!stopped) setPacksOpen(cfg.enabled && cfg.packs.length > 0);
      })
      .catch(() => {});

    async function load() {
      try {
        const info = await api.getCredits();

        if (stopped) return;
        setBalance(info.balance);

        if (!justPaid) return;

        // Paddle confirms the payment a few seconds later: wait for the
        // purchase to show up in the ledger.
        const recent = info.recent.some(
          (entry) =>
            entry.reason === "purchase" &&
            Date.now() - serverTime(entry.created_at) < 10 * 60 * 1000,
        );

        if (recent) {
          setWaiting(false);
          return;
        }

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
  }, []);

  if (!packsOpen && !waiting) return null;

  return (
    <section
      data-testid="credits-section"
      className="glass rounded-card border border-[var(--border)] p-6 sm:p-7"
    >
      <h2 className="font-heading text-[24px] font-light tracking-[-0.02em]">Deep scan credits</h2>

      {waiting ? (
        <p
          data-testid="credits-waiting"
          className="mt-2 text-[14px] text-[var(--text-muted)]"
        >
          Thank you. We are adding your credits. This usually takes a few
          seconds.
        </p>
      ) : null}

      <p
        data-testid="credits-balance"
        className="mt-2 text-[14px] text-[var(--text-muted)]"
      >
        {balance !== null ? (
          <>
            You have{" "}
            <strong className="text-[var(--text)]">{balance}</strong> Deep
            scan {balance === 1 ? "credit" : "credits"}.{" "}
          </>
        ) : null}
        Need more? Credits you buy never expire and are used after your
        monthly plan credits.
      </p>

      <div className="mt-4">
        <CreditPacks />
      </div>

      <p className="mt-3 text-[12px] text-[var(--text-muted)]">
        One-time payment, no subscription. Refunds are covered by the{" "}
        <Link href="/refunds" className="text-[var(--primary)] underline">
          Refund Policy
        </Link>
        .
      </p>
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
    <section className="glass rounded-card border border-[var(--border)] p-6 sm:p-7">
      <h2 className="font-heading text-[24px] font-light tracking-[-0.02em]">Download your data</h2>
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
        className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--primary-strong)] px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
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
    <section className="glass rounded-card border border-[var(--danger)] p-6 sm:p-7">
      <h2 className="font-heading text-[24px] font-light tracking-[-0.02em] text-[var(--danger)]">
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
            className="inline-flex h-10 items-center rounded-full bg-[var(--danger)] px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
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

const SECTIONS = [
  { id: "plan", label: "Plan & credits" },
  { id: "security", label: "Profile & security" },
  { id: "data", label: "Your data" },
];

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div>
      <div className="flex justify-between text-[14px]">
        <span>{label}</span>
        <span className="text-[var(--text-muted)]">
          {limit === null ? `${used} · no limit` : `${used} of ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
          <div className="iris h-full rounded-full" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

function PlanUsageSection({ planType }: { planType: string }) {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [stats, setStats] = useState<AssetStats | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api.getUsage(controller.signal).then(setUsage).catch(() => {});
    api.assetStats(controller.signal).then(setStats).catch(() => {});
    return () => controller.abort();
  }, []);

  const artworkLimit = ARTWORK_LIMITS[planType] ?? null;

  return (
    <section className="glass rounded-card border border-[var(--border)] p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="label-caps text-[var(--text-muted)]">Current plan</span>
          <p className="mt-2 font-heading text-[36px] font-light leading-none tracking-[-0.02em]">
            {planType}
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex h-10 items-center rounded-full bg-[var(--primary-strong)] px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85"
        >
          {planType === "Free" ? "Upgrade" : "Compare plans"}
        </Link>
      </div>

      <div className="mt-6 space-y-5">
        {stats && <UsageBar label="Artworks on auto-scan" used={stats.monitored} limit={artworkLimit} />}
        {usage && (
          <UsageBar
            label="Hand-started scans this month"
            used={usage.manual_scans.used}
            limit={usage.manual_scans.limit}
          />
        )}
        {usage && (
          <p className="text-[13px] text-[var(--text-muted)]">
            Resets on {formatDay(usage.manual_scans.resets_on)}. Automatic scans
            are included and don&apos;t count.
          </p>
        )}
      </div>
    </section>
  );
}

function SecuritySection({ email }: { email: string }) {
  const { logoutEverywhere } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendPasswordLink() {
    setBusy(true);
    setError("");

    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass rounded-card border border-[var(--border)] p-6 sm:p-7">
      <h2 className="font-heading text-[24px] font-light tracking-[-0.02em]">Profile & security</h2>
      <dl className="mt-5 text-[14px]">
        <dt className="label-caps text-[var(--text-muted)]">Email</dt>
        <dd className="mt-1 text-[16px]">{email}</dd>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || sent}
          onClick={() => void sendPasswordLink()}
          className="inline-flex h-10 items-center rounded-full border border-[var(--line-strong)] px-5 text-[11px] font-medium uppercase tracking-[0.08em] transition hover:bg-[var(--surface-muted)] disabled:opacity-50"
        >
          {sent ? "Link sent" : busy ? "Sending…" : "Change password"}
        </button>
        <button
          type="button"
          onClick={() => void logoutEverywhere()}
          className="inline-flex h-10 items-center rounded-full border border-[var(--line-strong)] px-5 text-[11px] font-medium uppercase tracking-[0.08em] transition hover:bg-[var(--surface-muted)]"
        >
          Sign out of all devices
        </button>
      </div>
      <p className="mt-3 text-[13px] text-[var(--text-muted)]">
        {sent
          ? `We emailed a link to ${email}. Open it to choose a new password.`
          : "We email you a link to choose a new password. Signing out everywhere ends every session, including this one."}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[var(--danger)]">
          {error}
        </p>
      )}
    </section>
  );
}

function AccountContent() {
  const { user } = useAuth();

  return (
    <AppShell>
      <PageTitle
        title="Account"
        subtitle={`Signed in as ${user.email} · ${user.plan_type} plan`}
      />

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Account sections" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block whitespace-nowrap rounded-full px-4 py-2 text-[14px] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-[760px] space-y-12">
          <div id="plan" className="scroll-mt-28 space-y-4">
            <span className="label-caps text-[var(--text-muted)]">Plan & credits</span>
            <PlanUsageSection planType={user.plan_type} />
            <SubscriptionSection planType={user.plan_type} />
            <CreditsSection />
          </div>

          <div id="security" className="scroll-mt-28 space-y-4">
            <span className="label-caps text-[var(--text-muted)]">Profile & security</span>
            <SecuritySection email={user.email} />
          </div>

          <div id="data" className="scroll-mt-28 space-y-4">
            <span className="label-caps text-[var(--text-muted)]">Your data</span>
            <DownloadSection />
            <DeleteSection email={user.email} isAdmin={Boolean(user.is_admin)} />
          </div>

          {CONTACT_EMAIL ? (
            <p className="text-[13px] text-[var(--text-muted)]">
              Need something else? Write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export default function AccountPage() {
  return (
    <AuthGate>
      <AccountContent />
    </AuthGate>
  );
}
