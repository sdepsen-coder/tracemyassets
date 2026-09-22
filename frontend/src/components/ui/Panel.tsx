import type { HTMLAttributes, ReactNode } from "react";

type PanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Panel({
  children,
  className = "",
  ...props
}: PanelProps) {
  return (
    <section
      className={[
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-card",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </section>
  );
}