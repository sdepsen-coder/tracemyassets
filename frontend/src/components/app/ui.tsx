"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon } from "@/components/dashboard/Icon";
import { Topbar } from "@/components/dashboard/Topbar";
import { SiteFooter } from "@/components/SiteFooter";

/** Header, centred content and footer shared by every signed-in page. */
export function AppShell({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
      <Topbar />

      <main className="flex-1 px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
        <div
          className={[
            "mx-auto",
            width === "narrow" ? "max-w-[760px]" : "max-w-[1280px]",
          ].join(" ")}
        >
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`glass rounded-card border border-[var(--border)] ${className}`}
    >
      {children}
    </section>
  );
}

type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  icon?: string;
  size?: "md" | "sm";
};

const PILL_VARIANTS: Record<NonNullable<PillProps["variant"]>, string> = {
  primary:
    "bg-[var(--primary-strong)] text-[var(--on-primary)] hover:opacity-85 disabled:opacity-40",
  secondary:
    "border border-[var(--line-strong)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-muted)] disabled:opacity-40",
  quiet:
    "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40",
  danger:
    "bg-[var(--danger)] text-[var(--on-primary)] hover:opacity-85 disabled:opacity-40",
};

function pillClass(
  variant: NonNullable<PillProps["variant"]>,
  size: NonNullable<PillProps["size"]>,
) {
  return [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium uppercase tracking-[0.08em] transition disabled:cursor-not-allowed",
    size === "sm" ? "h-9 px-4 text-[11px]" : "h-11 px-6 text-[12px]",
    PILL_VARIANTS[variant],
  ].join(" ");
}

export function Pill({
  variant = "primary",
  size = "md",
  icon,
  className = "",
  children,
  type = "button",
  ...rest
}: PillProps) {
  return (
    <button
      type={type}
      className={`${pillClass(variant, size)} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} className="text-[18px]" />}
      {children}
    </button>
  );
}

export function PillLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
}: {
  href: string;
  variant?: PillProps["variant"];
  size?: PillProps["size"];
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${pillClass(variant ?? "primary", size ?? "md")} ${className}`}
    >
      {children}
      {icon && <Icon name={icon} className="text-[18px]" />}
    </Link>
  );
}

export type ChipTone = "success" | "warning" | "info" | "neutral" | "danger";

const CHIP_TONES: Record<ChipTone, string> = {
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
  info: "iris text-[#111111]",
  neutral: "bg-[var(--surface-muted)] text-[var(--text-muted)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Chip({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: ChipTone;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.08em] ${CHIP_TONES[tone]} ${className}`}
    >
      {icon && <Icon name={icon} className="text-[15px]" />}
      {children}
    </span>
  );
}

export function PageTitle({
  eyebrow,
  title,
  subtitle,
  aside,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-heading text-[40px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[56px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-[640px] text-[16px] text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {aside}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const styles = {
    info: "bg-[var(--primary-soft)] text-[var(--primary-strong)]",
    error: "bg-[var(--danger-soft)] text-[var(--danger)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
  }[tone];

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-[14px] ${styles}`}
    >
      {children}
    </p>
  );
}

/** "Monthly scans" style cost line under a button. */
export function CostLine({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">{children}</p>
  );
}

/** Small uppercase tag above a title ("MONITORING", "STEP 2 OF 4"). */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="label-caps mb-4 inline-flex rounded-full border border-[var(--border)] px-3 py-1 text-[var(--text-muted)]">
      {children}
    </span>
  );
}
