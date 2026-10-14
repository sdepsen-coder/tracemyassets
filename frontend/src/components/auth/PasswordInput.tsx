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
        className="w-full rounded-xl border border-white/10 bg-[#090e1b] py-3 pl-3 pr-16 outline-none focus:border-sky-400 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-slate-400 transition hover:text-slate-100"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
