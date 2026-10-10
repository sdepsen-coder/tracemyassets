"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/dashboard/Icon";
import { PAID_PLANS_OPEN, PLANS, yearlySavingPercent } from "@/lib/plans";

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
              ) : (
                <span
                  data-testid={`plan-${plan.id}-status`}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[14px] font-semibold text-[var(--text-muted)]"
                >
                  {PAID_PLANS_OPEN ? "Choose plan" : "Opens soon"}
                </span>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
