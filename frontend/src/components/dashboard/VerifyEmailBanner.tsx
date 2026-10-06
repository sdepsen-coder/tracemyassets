"use client";

import { useState } from "react";

import { useAuth } from "@/components/AuthGate";
import { api } from "@/lib/api";

/**
 * Shown while the account's email address is not confirmed yet (only when
 * the server asks for confirmation): the free Deep scan credits wait for it.
 */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  if (user.email_verified !== false) return null;

  async function resend() {
    if (busy) return;

    setBusy(true);
    setNote("");

    try {
      const result = await api.sendVerification();
      setNote(result.message);
    } catch (err) {
      setNote(
        err instanceof Error ? err.message : "The email could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="border-b border-[var(--border)] bg-[var(--warning-soft)] text-[var(--warning)]"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13px] sm:px-6">
        <span className="font-medium">
          Please confirm your email address ({user.email}) to receive your free
          Deep scan credits.
        </span>

        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy}
          className="font-semibold underline underline-offset-2 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send the email again"}
        </button>

        {note && <span>{note}</span>}
      </div>
    </div>
  );
}
