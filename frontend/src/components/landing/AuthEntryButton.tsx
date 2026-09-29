"use client";

import type { ReactNode } from "react";

import { useAuthEntry } from "@/components/AuthGate";

type AuthEntryButtonProps = {
  mode: "login" | "register";
  variant?: "primary" | "ghost" | "onPrimary";
  size?: "md" | "lg";
  children: ReactNode;
};

const VARIANTS = {
  primary:
    "bg-[var(--primary-strong)] text-white shadow-floating hover:brightness-110",
  ghost:
    "text-[var(--text)] hover:bg-[var(--surface-muted)]",
  onPrimary: "bg-white text-[#1a2bc0] shadow-floating hover:bg-white/90",
} as const;

const SIZES = {
  md: "h-10 px-4 text-[13px]",
  lg: "h-12 px-6 text-[15px]",
} as const;

/** Opens the sign-in / registration form from the public landing page. */
export function AuthEntryButton({
  mode,
  variant = "primary",
  size = "md",
  children,
}: AuthEntryButtonProps) {
  const { openAuth } = useAuthEntry();

  return (
    <button
      type="button"
      onClick={() => openAuth(mode)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ${VARIANTS[variant]} ${SIZES[size]}`}
    >
      {children}
    </button>
  );
}
