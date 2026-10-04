"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "@/lib/api";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await api.resetPassword(token, password);
      setPassword("");
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
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b29] p-6 shadow-xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
        TraceMyAssets
      </p>

      <h1 className="mt-3 text-2xl font-bold">Choose a new password</h1>

      {done ? (
        <>
          <p
            role="status"
            className="mt-6 rounded-xl bg-sky-400/10 p-3 text-sm text-sky-200"
          >
            Your password has been changed. You can now sign in.
          </p>

          <Link
            href="/"
            className="mt-5 inline-block rounded-xl bg-[#4cd7f6] px-4 py-3 font-semibold text-[#003640]"
          >
            Go to sign in
          </Link>
        </>
      ) : !token ? (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300"
        >
          This reset link is incomplete. Please use the link from your email,
          or ask for a new one on the sign-in page.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="text-sm text-slate-300">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={busy}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090e1b] px-3 py-3 outline-none focus:border-sky-400 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-slate-400">
              At least 8 characters. Avoid common passwords like
              &quot;password123&quot;.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="break-words rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#4cd7f6] px-4 py-3 font-semibold text-[#003640] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
    <main className="flex min-h-screen items-center justify-center bg-[#0e1320] px-4 py-10 text-slate-100">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
