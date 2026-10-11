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
      <div
        role="group"
        aria-label="Billing period"
        data-testid="billing-toggle"
        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1 text-[13px] font-semibold"
      >
        {(["monthly", "yearly"] as Billing[]).map((option) => (
          <button
            key={option}
            type="button"
            data-testid={`billing-${option}`}
            aria-pressed={billing === option}
            onClick={() => setBilling(option)}
            className={[
              "rounded-lg px-4 py-1.5 transition",
              billing === option
                ? "bg-[var(--surface)] text-[var(--text)] shadow-card"
                : "text-[var(--text-muted)] hover:text-[var(--text)]",
            ].join(" ")}
          >
            {option === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      <div data-testid="plan-cards" className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const features = compact ? plan.features.slice(0, 4) : plan.features;
          const free = plan.id === "free";
          const yearly = billing === "yearly" && plan.yearlyUsd !== undefined;
          const saving = yearlySavingPercent(plan);

          return (
            <article
              key={plan.id}
              data-testid={`plan-${plan.id}`}
              className={[
                "flex flex-col rounded-2xl border bg-[var(--surface)] p-6 shadow-card",
                plan.highlight
                  ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
                  : "border-[var(--border)]",
              ].join(" ")}
            >
              <h3 className="font-heading text-[20px] font-semibold">
                {plan.name}
              </h3>
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                {plan.tagline}
              </p>

              <p className="mt-5 flex items-baseline gap-2">
                <span
                  data-testid={`plan-${plan.id}-price`}
                  className="font-heading text-[36px] font-bold tracking-[-0.03em]"
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
                      name="check_circle"
                      className="mt-0.5 shrink-0 text-[18px] text-[var(--success)]"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {free ? (
                <Link
                  href="/?auth=register"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-strong)] px-4 text-[14px] font-semibold text-white shadow-floating transition hover:brightness-110"
                >
                  Create free account
                </Link>
              ) : !open || account === undefined ? (
                <span
                  data-testid={`plan-${plan.id}-status`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[14px] font-semibold text-[var(--text-muted)]"
                >
                  {open ? "Checking..." : "Opens soon"}
                </span>
              ) : account === null ? (
                <Link
                  href="/?auth=register"
                  data-testid={`plan-${plan.id}-signup`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-strong)] px-4 text-[14px] font-semibold text-white shadow-floating transition hover:brightness-110"
                >
                  Sign up to choose
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
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary-strong)] px-4 text-[14px] font-semibold text-white shadow-floating transition hover:brightness-110 disabled:opacity-60"
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
