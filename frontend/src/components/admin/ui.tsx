import type { ReactNode } from "react";

import { Panel } from "@/components/ui/Panel";

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "danger";
}) {
  return (
    <Panel className="p-4">
      <p className="text-[12px] font-medium text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={[
          "mt-1 font-heading text-[26px] font-bold tracking-[-0.02em]",
          tone === "danger" ? "text-[var(--danger)]" : "",
        ].join(" ")}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{hint}</p>
      )}
    </Panel>
  );
}

export function Badge({
  children,
  className = "bg-[var(--surface-muted)] text-[var(--text-muted)]",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function Pager({
  total,
  offset,
  pageSize,
  onChange,
}: {
  total: number;
  offset: number;
  pageSize: number;
  onChange: (offset: number) => void;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + pageSize, total);

  return (
    <div className="mt-3 flex items-center justify-between text-[13px] text-[var(--text-muted)]">
      <span>
        {from}–{to} of {total}
      </span>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - pageSize))}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium text-[var(--text)] disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={offset + pageSize >= total}
          onClick={() => onChange(offset + pageSize)}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium text-[var(--text)] disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export const inputClass =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text)] outline-none focus:border-[var(--primary)]";

export const smallButton =
  "rounded-lg border border-[var(--border)] px-3 py-1.5 text-[13px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-muted)] disabled:opacity-50";

export function ErrorLine({ message }: { message: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[13px] text-[var(--danger)]"
    >
      {message}
    </p>
  );
}
