"use client";

import { useEffect, useState } from "react";

import {
  api,
  ApiError,
  type BillingConfig,
  type BillingStatus,
  type CreditPack,
} from "@/lib/api";
import { startPackCheckout } from "@/lib/billing";

/** "$4.99" from US cents. */
export function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** What one credit costs in a pack, e.g. "$0.40". */
function each(pack: CreditPack): string {
  return usd(pack.amount / pack.credits);
}

type PacksState = {
  /** Packs that can be bought right now (payments on, packs found). */
  packs: CreditPack[];
  /** undefined = still asking, null = signed out. */
  account: BillingStatus | null | undefined;
  config: BillingConfig | null;
};

function usePacksState(): PacksState {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [account, setAccount] = useState<BillingStatus | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const controller = new AbortController();

    api
      .billingConfig(controller.signal)
      .then((value) => {
        setConfig(value);

        if (!value.enabled || value.packs.length === 0) return;

        return api
          .billingStatus(controller.signal)
          .then(setAccount)
          .catch((err: unknown) => {
            if (err instanceof ApiError && err.status === 401) {
              setAccount(null);
            }
          });
      })
      .catch(() => {
        /* No packs are shown if this fails. */
      });

    return () => controller.abort();
  }, []);

  const packs = config?.enabled ? (config.packs ?? []) : [];

  return { packs, account, config };
}

type CreditPacksProps = {
  /** Smaller buttons for the scan screen. */
  compact?: boolean;
  /**
   * Pricing page: a signed-out visitor sees the packs and their prices too,
   * with a sign-in link in place of the buy button.
   */
  showSignedOutHint?: boolean;
};

export function CreditPacks({
  compact = false,
  showSignedOutHint = false,
}: CreditPacksProps) {
  const { packs, account, config } = usePacksState();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (packs.length === 0 || !config) return null;

  if (!account) {
    if (account === null && showSignedOutHint) {
      return (
        <div data-testid="credit-packs-signed-out">
          <div className="grid gap-3 sm:grid-cols-3">
            {packs.map((pack) => (
              <div
                key={pack.price_id}
                className="glass flex flex-col rounded-card border border-[var(--border)] p-4"
              >
                <p className="font-heading text-[22px] font-semibold text-[var(--text)]">
                  {pack.credits}{" "}
                  <span className="font-sans text-[14px] font-medium text-[var(--text-muted)]">
                    Deep scan credits
                  </span>
                </p>
                <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">
                  {usd(pack.amount)}
                  <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">
                    {each(pack)} each
                  </span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-[var(--text-muted)]">
            <a href="/?auth=login" className="text-[var(--primary)] underline">
              Sign in
            </a>{" "}
            or{" "}
            <a href="/?auth=register" className="text-[var(--primary)] underline">
              create a free account
            </a>{" "}
            to buy extra Deep scan credits.
          </p>
        </div>
      );
    }

    return null;
  }

  const who = { user_id: account.user_id, email: account.email };

  async function buy(pack: CreditPack) {
    if (!config) return;

    setError("");
    setBusy(pack.price_id);

    try {
      await startPackCheckout(config, pack.price_id, who);
    } catch {
      setError(
        "The payment window could not be opened. Please try again in a moment.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div data-testid="credit-packs">
      <div
        className={
          compact
            ? "flex flex-wrap gap-2"
            : "grid gap-3 sm:grid-cols-3"
        }
      >
        {packs.map((pack) =>
          compact ? (
            <button
              key={pack.price_id}
              type="button"
              data-testid={`credit-pack-${pack.credits}`}
              disabled={busy !== null}
              onClick={() => void buy(pack)}
              className="inline-flex h-8 items-center rounded-xl border border-[var(--primary)]/40 bg-[var(--surface)] px-3 text-[14px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
            >
              {pack.credits} credits · {usd(pack.amount)}
            </button>
          ) : (
            <div
              key={pack.price_id}
              className="flex flex-col glass rounded-card border border-[var(--border)] p-4"
            >
              <p className="text-[22px] font-semibold text-[var(--text)]">
                {pack.credits}{" "}
                <span className="text-[14px] font-medium text-[var(--text-muted)]">
                  Deep scan credits
                </span>
              </p>
              <p className="mt-1 text-[15px] font-semibold text-[var(--text)]">
                {usd(pack.amount)}
                <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">
                  {each(pack)} each
                </span>
              </p>
              <button
                type="button"
                data-testid={`credit-pack-${pack.credits}`}
                disabled={busy !== null}
                onClick={() => void buy(pack)}
                className="btn-glow mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary-strong)] px-4 text-[14px] font-semibold text-[var(--on-primary)] transition disabled:opacity-60"
              >
                {busy === pack.price_id ? "Opening..." : "Buy credits"}
              </button>
            </div>
          ),
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Shown on the scan screen when the balance is too low: offers the packs
 * when they are on sale, otherwise sends the person to support.
 */
export function OutOfCreditsNotice() {
  const { packs, account } = usePacksState();
  const canBuy = packs.length > 0 && Boolean(account);

  return (
    <div className="mt-2" data-testid="out-of-credits">
      <p className="text-[var(--danger)]">
        You have no deep scan credits left.
        {canBuy
          ? " Buy more to continue; they never expire."
          : " Contact support to get more."}
      </p>
      {canBuy ? (
        <div className="mt-2">
          <CreditPacks compact />
        </div>
      ) : null}
    </div>
  );
}
