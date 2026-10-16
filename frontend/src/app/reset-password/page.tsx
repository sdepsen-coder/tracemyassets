"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import { PasswordInput } from "@/components/auth/PasswordInput";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    if (password !== repeat) {
      setError("The two passwords are not the same.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api.resetPassword(token, password);
      setPassword("");
      setRepeat("");
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The password could not be changed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass w-full max-w-md rounded-[28px] border border-[var(--border)] p-7 sm:p-10">
      <p className="label-caps text-[var(--text-muted)]">
        TraceMyAssets
      </p>

      <h1 className="mt-4 font-heading text-[34px] font-light leading-[1.1] tracking-[-0.03em]">Choose a new password</h1>

      {done ? (
        <>
          <p
            role="status"
            className="mt-6 rounded-xl bg-[var(--success-soft)] p-3 text-[14px] text-[var(--success)]"
          >
            Your password has been changed. You can now sign in.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-[var(--primary-strong)] px-7 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)]"
          >
            Go to sign in
          </Link>
        </>
      ) : !token ? (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-[var(--danger-soft)] p-3 text-[14px] text-[var(--danger)]"
        >
          This reset link is incomplete. Please use the link from your email,
          or ask for a new one on the sign-in page.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="label-caps text-[var(--text-muted)]">
              New password
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={busy}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="mt-2 text-[13px] text-[var(--text-muted)]">
              At least 8 characters. Avoid common passwords like
              &quot;password123&quot;.
            </p>
          </div>

          <div>
            <label htmlFor="repeat-password" className="label-caps text-[var(--text-muted)]">
              New password (again)
            </label>
            <PasswordInput
              id="repeat-password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={busy}
              value={repeat}
              onChange={(event) => setRepeat(event.target.value)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="break-words rounded-xl bg-[var(--danger-soft)] p-3 text-[14px] text-[var(--danger)]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-full bg-[var(--primary-strong)] text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Please wait..." : "Change password"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 text-[var(--text)]">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
