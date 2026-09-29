import { Icon } from "./Icon";

type StatCardProps = {
  label: string;
  value: string;
  sublabel: string;
  icon: string;
  tone?: "primary" | "success" | "warning" | "neutral";
  footer?: string;
  /** When set, the whole tile becomes a button that runs this on click. */
  onClick?: () => void;
  /** Screen-reader hint describing where a clickable tile leads. */
  actionLabel?: string;
};

const tones = {
  primary: {
    icon: "bg-[var(--primary-soft)] text-[var(--primary)]",
    chip: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  success: {
    icon: "bg-[var(--success-soft)] text-[var(--success)]",
    chip: "bg-[var(--success-soft)] text-[var(--success)]",
  },
  warning: {
    icon: "bg-[var(--warning-soft)] text-[var(--warning)]",
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  neutral: {
    icon: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
    chip: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
  },
};

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  tone = "neutral",
  footer = "",
  onClick,
  actionLabel,
}: StatCardProps) {
  const classes = tones[tone];

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {label}
          </p>

          <p className="mt-3 font-heading text-[36px] font-semibold leading-none tracking-[-0.04em] text-[var(--text)]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${classes.icon}`}
        >
          <Icon name={icon} />
        </div>
      </div>

      <div className="mt-4 flex min-h-6 flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes.chip}`}
        >
          {sublabel}
        </span>

        {footer && (
          <span className="text-[11px] text-[var(--text-muted)]">
            {footer}
          </span>
        )}
      </div>
    </>
  );

  const base =
    "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={actionLabel}
        aria-label={actionLabel ? `${label}: ${value}. ${actionLabel}` : undefined}
        className={`${base} block w-full text-left transition hover:border-[var(--primary)]/50 hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]`}
      >
        {content}
      </button>
    );
  }

  return <article className={base}>{content}</article>;
}
