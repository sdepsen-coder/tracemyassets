import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={[
        "rounded-2xl border border-white/8 bg-[#161b29] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_14px_40px_rgba(0,0,0,0.22)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}