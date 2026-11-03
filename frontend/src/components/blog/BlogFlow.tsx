import type { ReactNode } from "react";

/**
 * A small numbered flow for blog posts: a titled box with steps, an optional
 * closing line and a caption. Plain markup, no images.
 */
export type FlowStep = { title: string; text?: string };

export function BlogFlow({
  title,
  steps,
  ending,
  caption,
}: {
  title: string;
  steps: FlowStep[];
  ending?: ReactNode;
  caption: string;
}) {
  return (
    <figure className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <p className="text-[15px] font-medium text-[var(--text)]">{title}</p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 text-[13px] font-medium text-[var(--primary)]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-[15px] leading-relaxed text-[var(--text-muted)]">
              <strong className="font-medium text-[var(--text)]">{step.title}</strong>
              {step.text && <span className="block">{step.text}</span>}
            </span>
          </li>
        ))}
      </ol>
      {ending && (
        <p className="mt-4 text-[14px] font-medium text-[var(--primary)]">{ending}</p>
      )}
      <figcaption className="mt-4 text-[13px] leading-relaxed text-[var(--text-muted)]">
        {caption}
      </figcaption>
    </figure>
  );
}
