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
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b29] p-6 shadow-xl sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
        TraceMyAssets
      </p>

      <h1 className="mt-3 text-2xl font-bold">Confirm your email</h1>

      {state === "working" && (
        <p role="status" className="mt-6 text-sm text-slate-300">
          Confirming your address…
        </p>
      )}

      {state === "done" && (
        <p
          role="status"
          className="mt-6 rounded-xl bg-sky-400/10 p-3 text-sm text-sky-200"
        >
          Your email address is confirmed. Your free Deep scan credits are
          ready.
        </p>
      )}

      {state === "failed" && (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300"
        >
          {message}
        </p>
      )}

      {state !== "working" && (
        <Link
          href="/"
          className="mt-5 inline-block rounded-xl bg-[#4cd7f6] px-4 py-3 font-semibold text-[#003640]"
        >
          {state === "done" ? "Open the dashboard" : "Go to sign in"}
        </Link>
      )}
    </section>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e1320] px-4 py-10 text-slate-100">
      <Suspense fallback={null}>
        <VerifyEmail />
      </Suspense>
    </main>
  );
}
