"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { SiteFooter } from "@/components/SiteFooter";
import { api, ApiError, type User } from "@/lib/api";

type AuthContextValue = {
  user: User;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an authenticated AuthGate.");
  }

  return context;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const [restoreKey, setRestoreKey] = useState(0);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const authPending = useRef(false);
  const authEpoch = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    setChecking(true);
    setRestoreError("");

    async function restoreSession() {
      try {
        const user = await api.me(controller.signal);

        if (!controller.signal.aborted) {
          setSession(user);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        if (err instanceof ApiError && err.status === 401) {
          setSession(null);
        } else {
          setRestoreError(
            "Unable to check your session. Make sure the API is running, then retry.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      }
    }

    void restoreSession();

    return () => controller.abort();
  }, [restoreKey]);

  const sessionUserId = session?.id;

  useEffect(() => {
    if (sessionUserId === undefined) return;

    const controller = new AbortController();
    let pending = false;

    async function validateSession() {
      if (pending || authPending.current || controller.signal.aborted) {
        return;
      }

      pending = true;
      const epoch = authEpoch.current;

      try {
        const user = await api.me(controller.signal);

        if (
          controller.signal.aborted ||
          epoch !== authEpoch.current ||
          authPending.current
        ) {
          return;
        }

        setSession(user);
      } catch (err) {
        if (
          controller.signal.aborted ||
          epoch !== authEpoch.current ||
          authPending.current
        ) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          authEpoch.current += 1;
          setSession(null);
          setPassword("");
          setMode("login");
          setError("");
          setMessage("Your session has expired. Please sign in again.");
        }

        // Network failures must not be treated as expired sessions.
      } finally {
        pending = false;
      }
    }

    const check = () => {
      void validateSession();
    };

    const timer = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);

    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [sessionUserId]);

  const logout = useCallback(async () => {
    if (authPending.current) return;

    authPending.current = true;
    authEpoch.current += 1;
    setBusy(true);
    setError("");

    try {
      await api.logout();

      setSession(null);
      setPassword("");
      setMessage("");
      setMode("login");
    } catch {
      setError(
        "Sign out could not be confirmed. Check your connection and retry.",
      );
    } finally {
      authPending.current = false;
      setBusy(false);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authPending.current) return;

    authPending.current = true;
    authEpoch.current += 1;
    setBusy(true);
    setError("");
    setMessage("");

    const credentials = {
      email: email.trim(),
      password,
    };

    try {
      if (mode === "register") {
        await api.register(credentials);
        setMode("login");
        setPassword("");
        setMessage("Your account has been created. You can now sign in.");
        return;
      }

      const user = await api.login(credentials);

      setPassword("");
      setSession(user);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The request could not be completed.",
      );
    } finally {
      authPending.current = false;
      setBusy(false);
    }
  }

  if (checking || restoreError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0e1320] px-4 text-slate-100">
        <div className="max-w-md text-center">
          <p role={restoreError ? "alert" : "status"}>
            {checking ? "Checking your session..." : restoreError}
          </p>

          {!checking && restoreError && (
            <button
              type="button"
              onClick={() => setRestoreKey((value) => value + 1)}
              className="mt-4 rounded-xl bg-[#4cd7f6] px-4 py-2 font-semibold text-[#003640]"
            >
              Retry
            </button>
          )}
        </div>
      </main>
    );
  }

  if (session) {
    return (
      <AuthContext.Provider
        key={session.id}
        value={{ user: session, logout }}
      >
        <div className="border-b border-white/10 bg-[#161b29] px-4 py-3 text-slate-200">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {session.email}
              <span className="ml-2 text-sky-300">
                {session.plan_type}
              </span>
            </p>

            <button
              type="button"
              disabled={busy}
              onClick={logout}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
            >
              {busy ? "Signing out..." : "Sign out"}
            </button>
          </div>

          <p className="mx-auto mt-2 max-w-[1440px] text-xs text-amber-300">
            Asset uploads and counts use live account data. Monitoring and
            evidence panels are demo previews.
          </p>

          {error && (
            <p
              role="alert"
              className="mx-auto mt-2 max-w-[1440px] text-sm text-rose-300"
            >
              {error}
            </p>
          )}
        </div>

        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0e1320] text-slate-100">
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b29] p-6 shadow-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          TraceMyAssets
        </p>

        <h1 className="mt-3 text-2xl font-bold">
          {mode === "login" ? "Sign in to your account" : "Create an account"}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Manage your digital assets from your own account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="auth-email" className="text-sm text-slate-300">
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              disabled={busy}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090e1b] px-3 py-3 outline-none focus:border-sky-400 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="text-sm text-slate-300">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "register" ? 12 : 1}
              maxLength={128}
              disabled={busy}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090e1b] px-3 py-3 outline-none focus:border-sky-400 disabled:opacity-50"
            />
            {mode === "register" && (
              <p className="mt-2 text-xs text-slate-400">
                Password must be between 12 and 128 characters.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="break-words rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-xl bg-sky-400/10 p-3 text-sm text-sky-200"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#4cd7f6] px-4 py-3 font-semibold text-[#003640] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setPassword("");
            setError("");
            setMessage("");
          }}
          className="mt-5 text-sm text-sky-300 hover:text-sky-200 disabled:opacity-50"
        >
          {mode === "login"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>

    <SiteFooter tone="dark" />
    </div>
  );
}