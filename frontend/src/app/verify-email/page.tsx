"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { api } from "@/lib/api";

type State = "working" | "done" | "failed";

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<State>(token ? "working" : "failed");
  const [message, setMessage] = useState(
    token
      ? ""
      : "This link is incomplete. Please use the link from your email.",
  );

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    api
      .verifyEmail(token)
      .then(() => {
        if (!controller.signal.aborted) setState("done");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;

        setState("failed");
        setMessage(
          err instanceof Error
            ? err.message
            : "The address could not be confirmed.",
        );
      });

    return () => controller.abort();
  }, [token]);

  return (
    <section className="glass w-full max-w-md rounded-[28px] border border-[var(--border)] p-7 sm:p-10">
      <p className="label-caps text-[var(--text-muted)]">
        TraceMyAssets
      </p>

      <h1 className="mt-4 font-heading text-[34px] font-light leading-[1.1] tracking-[-0.03em]">Confirm your email</h1>

      {state === "working" && (
        <p role="status" className="mt-6 text-[14px] text-[var(--text-muted)]">
          Confirming your address…
        </p>
      )}

      {state === "done" && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-[var(--success-soft)] p-3 text-[14px] text-[var(--success)]"
        >
          Your email address is confirmed. Your free Deep scan credits are
          ready.
        </p>
      )}

      {state === "failed" && (
        <>
          <p
            role="alert"
            className="mt-6 rounded-xl bg-[var(--danger-soft)] p-3 text-[14px] text-[var(--danger)]"
          >
            {message}
          </p>
          <p className="mt-3 text-[14px] text-[var(--text-muted)]">
            A confirmation link works once. If you already used it, your
            address is probably confirmed. If you are not signed in, you
            will be asked to sign in.
          </p>
        </>
      )}

      {state !== "working" && (
        <Link
          href="/"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-[var(--primary-strong)] px-7 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)]"
        >
          {state === "done" ? "Open the dashboard" : "Open TraceMyAssets"}
        </Link>
      )}
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10 text-[var(--text)]">
      <Suspense fallback={null}>
        <VerifyEmail />
      </Suspense>
    </main>
  );
}
