"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/dashboard/Icon";
import {
  api,
  ApiError,
  type BillingConfig,
  type BillingStatus,
} from "@/lib/api";
import { startCheckout } from "@/lib/billing";
import { PLANS, yearlySavingPercent } from "@/lib/plans";

type PlanCardsProps = {
  /** Landing page summary: fewer lines per card. */
  compact?: boolean;
};

type Billing = "monthly" | "yearly";

function dollars(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function PlanCards({ compact = false }: PlanCardsProps) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [config, setConfig] = useState<BillingConfig | null>(null);
  // undefined = still asking, null = signed out.
  const [account, setAccount] = useState<BillingStatus | null | undefined>(
    undefined,
  );
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api
      .billingConfig(controller.signal)
      .then((value) => {
        setConfig(value);

        if (!value.enabled) return;

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
        /* Plans simply stay "Opens soon". */
      });

    return () => controller.abort();
  }, []);

  async function choose(planId: "pro" | "extra") {
    if (!config || !account) return;

    setError("");
    setBusyPlan(planId);

    try {
      await startCheckout(
        config,
        planId === "pro" ? "Pro" : "Extra",
        billing === "yearly" ? "year" : "month",
        { user_id: account.user_id, email: account.email },
      );
    } catch {
      setError(
        "The payment window could not be opened. Please try again in a moment.",
      );
    } finally {
      setBusyPlan(null);
    }
  }

  const open = Boolean(config?.enabled);
  const subscribed = Boolean(account?.subscription);

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
      <div
        role="group"
        aria-label="Billing period"
        data-testid="billing-toggle"
        className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-muted)] p-1 text-[13px] font-semibold"
      >
        {(["monthly", "yearly"] as Billing[]).map((option) => (
          <button
            key={option}
            type="button"
            data-testid={`billing-${option}`}
            aria-pressed={billing === option}
            onClick={() => setBilling(option)}
            className={[
              "rounded-full px-4 py-1.5 transition",
              billing === option
                ? "bg-[var(--primary-strong)] text-[var(--on-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]",
            ].join(" ")}
          >
            {option === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      </div>

      <div data-testid="plan-cards" className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          // The short list on the home page must still show the Free/Pro
          // difference: whether you can see where a match was found.
          // ...and the paid plans' reporting guide and letters, so the home
          // page and the Pricing page list the same benefits.
          const keep = plan.features.filter(
            (line, index) => index < 4 || /where|letters/i.test(line),
          );
          const features = compact ? keep : plan.features;
          const free = plan.id === "free";
          const yearly = billing === "yearly" && plan.yearlyUsd !== undefined;
          const saving = yearlySavingPercent(plan);
          // The bright button goes to the free plan (the first step for
          // every visitor) and the highlighted paid plan; the other is quiet.
          const cta = plan.highlight || free
            ? "btn-glow rounded-xl bg-[var(--primary-strong)] px-4 text-[14px] font-semibold text-[var(--on-primary)] transition"
            : "rounded-xl border border-[var(--line-strong)] bg-[var(--surface-raised)] px-4 text-[14px] font-semibold text-[var(--text)] transition hover:border-[var(--border-glow)] hover:text-[var(--primary)]";

          return (
            <article
              key={plan.id}
              data-testid={`plan-${plan.id}`}
              className={[
                "glass relative flex flex-col rounded-card border p-7",
                plan.highlight
                  ? "border-[var(--border-glow)] shadow-[0_0_50px_-12px_rgb(0_210_255/0.5)] md:-my-3 md:py-10"
                  : "border-[var(--border)]",
              ].join(" ")}
            >
              {plan.highlight && (
                <span className="iris absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#04121c]">
                  Best for sellers
                </span>
              )}
              <h3 className="flex items-center justify-between font-heading text-[22px] font-semibold">
                {plan.name}
              </h3>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                {plan.tagline}
              </p>

              <p className="mt-5 flex items-baseline gap-2">
                <span
                  data-testid={`plan-${plan.id}-price`}
                  className={`font-heading text-[44px] font-bold tracking-[-0.03em] ${plan.highlight ? "text-[var(--primary)]" : ""}`}
                >
                  {yearly ? dollars(plan.yearlyUsd as number) : plan.price}
                </span>
                <span className="text-[13px] text-[var(--text-muted)]">
                  {yearly ? "per year" : plan.per}
                </span>
              </p>
              <p
                data-testid={`plan-${plan.id}-yearly-note`}
                className="mt-1 min-h-[20px] text-[13px] text-[var(--text-muted)]"
              >
                {yearly
                  ? `${dollars((plan.yearlyUsd as number) / 12)} a month, billed yearly${
                      saving ? ` · save ${saving}%` : ""
                    }`
                  : ""}
              </p>

              <ul className="mt-4 flex-1 space-y-3 text-[14px] leading-snug text-[var(--text-muted)]">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Icon
                      name="check"
                      className="mt-0.5 shrink-0 text-[18px] text-[var(--accent)]"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {free ? (
                <Link
                  href="/?auth=register"
                  className={`mt-6 inline-flex h-11 items-center justify-center ${cta}`}
                >
                  Create free account
                </Link>
              ) : config !== null && !open ? (
                <span
                  data-testid={`plan-${plan.id}-status`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[14px] font-semibold text-[var(--text-muted)]"
                >
                  Opening soon
                </span>
              ) : account === null || account === undefined ? (
                <Link
                  href="/?auth=register"
                  data-testid={`plan-${plan.id}-signup`}
                  className={`mt-6 inline-flex h-11 items-center justify-center ${cta}`}
                >
                  {account === null ? "Sign up to choose" : "Choose plan"}
                </Link>
              ) : subscribed ? (
                account.subscription?.plan.toLowerCase() === plan.id ? (
                  <Link
                    href="/account"
                    data-testid={`plan-${plan.id}-current`}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[14px] font-semibold"
                  >
                    Your plan · manage
                  </Link>
                ) : (
                  <Link
                    href="/account"
                    data-testid={`plan-${plan.id}-change`}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border)] px-4 text-[14px] font-semibold text-[var(--text-muted)]"
                  >
                    Change on your Account page
                  </Link>
                )
              ) : (
                <button
                  type="button"
                  data-testid={`plan-${plan.id}-choose`}
                  disabled={busyPlan !== null}
                  onClick={() => void choose(plan.id as "pro" | "extra")}
                  className={`mt-6 inline-flex h-11 items-center justify-center ${cta} disabled:opacity-60`}
                >
                  {busyPlan === plan.id ? "Opening..." : "Choose plan"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          data-testid="checkout-error"
          className="text-[13px] text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
