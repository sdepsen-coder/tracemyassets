"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuthEntry, useOptionalAuth } from "@/components/AuthGate";

type AuthEntryButtonProps = {
  mode: "login" | "register";
  variant?: "primary" | "ghost" | "onPrimary";
  size?: "md" | "lg";
  children: ReactNode;
};

const VARIANTS = {
  primary:
    "bg-[var(--primary-strong)] text-[var(--on-primary)] hover:opacity-85",
  ghost:
    "text-[var(--text)] hover:bg-[var(--surface-muted)]",
  onPrimary: "bg-white text-[#111111] hover:bg-white/90",
} as const;

const SIZES = {
  md: "h-10 px-5 text-[11px]",
  lg: "h-12 px-7 text-[12px]",
} as const;

/**
 * Opens the sign-in / registration form from the public landing page.
 * When the visitor is already signed in (the page is also reachable from
 * inside the app) there is nothing to sign in to: the sign-in button
 * disappears and the sign-up buttons become "Open Monitoring".
 */
export function AuthEntryButton({
  mode,
  variant = "primary",
  size = "md",
  children,
}: AuthEntryButtonProps) {
  const { openAuth } = useAuthEntry();
  const auth = useOptionalAuth();
  const className = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium uppercase tracking-[0.08em] transition ${VARIANTS[variant]} ${SIZES[size]}`;

  if (auth) {
    if (mode === "login") {
      return null;
    }

    return (
      <Link href="/" className={className}>
        Open Monitoring
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAuth(mode)}
      className={className}
    >
      {children}
    </button>
  );
}
