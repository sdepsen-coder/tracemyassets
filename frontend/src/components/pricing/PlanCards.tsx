import Link from "next/link";

import { Icon } from "@/components/dashboard/Icon";
import { PAID_PLANS_OPEN, PLANS } from "@/lib/plans";

type PlanCardsProps = {
  /** Landing page summary: fewer lines per card. */
  compact?: boolean;
};

export function PlanCards({ compact = false }: PlanCardsProps) {
  return (
    <div
      data-testid="plan-cards"
      className="grid gap-5 md:grid-cols-3"
    >
      {PLANS.map((plan) => {
        const features = compact ? plan.features.slice(0, 4) : plan.features;
        const free = plan.id === "free";

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
              <span className="font-heading text-[36px] font-bold tracking-[-0.03em]">
                {plan.price}
              </span>
              <span className="text-[13px] text-[var(--text-muted)]">
                {plan.per}
              </span>
            </p>

            <ul className="mt-5 flex-1 space-y-3 text-[14px] leading-snug text-[var(--text-muted)]">
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
  );
}
