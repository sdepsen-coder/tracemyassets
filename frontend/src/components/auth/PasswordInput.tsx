"use client";

import { useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
>;

/**
 * A password field with a Show / Hide button, so people can check what
 * they typed. Used wherever a password is chosen or entered.
 */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className="h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-4 pr-16 text-[16px] text-[var(--text)] outline-none focus:border-[var(--text)] disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)] transition hover:text-[var(--text)]"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
