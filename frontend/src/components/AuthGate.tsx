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

import { FloatingFeedback } from "@/components/dashboard/FloatingFeedback";
import { SiteFooter } from "@/components/SiteFooter";
import { api, ApiError, type User } from "@/lib/api";

type AuthContextValue = {
  user: User;
  logout: () => Promise<void>;
  /** Ends the session on every device, not just this browser. */
  logoutEverywhere: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Lets the public landing page (rendered inside AuthGate while signed out)
 * open the sign-in / registration form without owning any auth state.
 */
type AuthEntryContextValue = {
  openAuth: (mode: "login" | "register") => void;
};

const AuthEntryContext = createContext<AuthEntryContextValue>({
  openAuth: () => {},
});

export function useAuthEntry(): AuthEntryContextValue {
  return useContext(AuthEntryContext);
}

/** The signed-in session, or null when nobody is signed in (public pages). */
export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an authenticated AuthGate.");
  }

  return context;
}

type AuthGateProps = {
  children: ReactNode;
  /**
   * Optional public page shown to signed-out visitors instead of going
   * straight to the sign-in form. Only the dashboard route passes this.
   */
  landing?: ReactNode;
};

const GOOGLE_ERRORS: Record<string, string> = {
  google_failed: "Google sign-in could not be completed. Please try again.",
  google_cancelled: "Google sign-in was cancelled.",
  google_email:
    "Google did not confirm your email address, so we could not sign you in.",
  google_unavailable: "Google sign-in is not available right now.",
  account_suspended: "This account is suspended.",
  account_exists:
    "An account already exists for this email address. Please sign in with your password.",
  too_many_signups:
    "Too many accounts have been created from your network today. Please try again tomorrow.",
};

export function AuthGate({ children, landing }: AuthGateProps) {
  const [screen, setScreen] = useState<"landing" | "auth">("landing");
  const [session, setSession] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [restoreError, setRestoreError] = useState("");
  const [restoreKey, setRestoreKey] = useState(0);

  const [mode, setMode] = useState<"login" | "register" | "forgot">(
    "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [googleEnabled, setGoogleEnabled] = useState(false);

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

        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        ) {
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

  useEffect(() => {
    const controller = new AbortController();

    api
      .authProviders(controller.signal)
      .then((providers) => setGoogleEnabled(providers.google))
      .catch(() => {
        // Without the list the Google button simply stays hidden.
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Google sends the browser back to "/?auth_error=..." when sign-in
    // fails: show the sign-in form with the reason.
    const params = new URLSearchParams(window.location.search);
    if (params.get("account_deleted")) {
      params.delete("account_deleted");
      const rest = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (rest ? `?${rest}` : ""),
      );

      setMode("login");
      setScreen("auth");
      setMessage("Your account and its data have been deleted.");
      return;
    }

    const reason = params.get("auth_error");

    if (!reason) return;

    params.delete("auth_error");
    const rest = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (rest ? `?${rest}` : ""),
    );

    setMode("login");
    setScreen("auth");
    setError(GOOGLE_ERRORS[reason] ?? "Sign-in could not be completed.");
  }, []);

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

        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          authEpoch.current += 1;
          setSession(null);
          setPassword("");
          setMode("login");
          setError(err.status === 403 ? err.message : "");
          setScreen("auth");
          setMessage(
            err.status === 403
              ? ""
              : "Your session has expired. Please sign in again.",
          );
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

  const endSession = useCallback(async (call: () => Promise<void>) => {
    if (authPending.current) return;

    authPending.current = true;
    authEpoch.current += 1;
    setBusy(true);
    setError("");

    try {
      await call();

      setSession(null);
      setPassword("");
      setMessage("");
      setMode("login");
      setScreen("landing");
    } catch {
      setError(
        "Sign out could not be confirmed. Check your connection and retry.",
      );
    } finally {
      authPending.current = false;
      setBusy(false);
    }
  }, []);

  const logout = useCallback(() => endSession(api.logout), [endSession]);

  const logoutEverywhere = useCallback(
    () => endSession(api.logoutEverywhere),
    [endSession],
  );

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
      if (mode === "forgot") {
        const result = await api.forgotPassword(credentials.email);
        setMessage(result.message);
        return;
      }

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
        value={{ user: session, logout, logoutEverywhere }}
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

        <FloatingFeedback />
      </AuthContext.Provider>
    );
  }

  if (landing && screen === "landing") {
    return (
      <AuthEntryContext.Provider
        value={{
          openAuth: (nextMode) => {
            setMode(nextMode);
            setPassword("");
            setError("");
            setMessage("");
            setScreen("auth");
            window.scrollTo({ top: 0 });
          },
        }}
      >
        {landing}
      </AuthEntryContext.Provider>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0e1320] text-slate-100">
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b29] p-6 shadow-xl sm:p-8">
        {landing && (
          <button
            type="button"
            onClick={() => setScreen("landing")}
            className="mb-4 text-sm text-slate-400 hover:text-slate-200"
          >
            &larr; Back to home
          </button>
        )}

        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          TraceMyAssets
        </p>

        <h1 className="mt-3 text-2xl font-bold">
          {mode === "login"
            ? "Sign in to your account"
            : mode === "register"
              ? "Create an account"
              : "Reset your password"}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          {mode === "forgot"
            ? "Enter your email and we will send you a link to choose a new password."
            : "Manage your digital assets from your own account."}
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

          {mode !== "forgot" && (
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
              minLength={mode === "register" ? 8 : 1}
              maxLength={128}
              disabled={busy}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#090e1b] px-3 py-3 outline-none focus:border-sky-400 disabled:opacity-50"
            />
            {mode === "register" && (
              <p className="mt-2 text-xs text-slate-400">
                At least 8 characters. Avoid common passwords like "password123".
              </p>
            )}
          </div>
          )}

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
                : mode === "register"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>

        {googleEnabled && mode !== "forgot" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <a
              href="/api/v1/auth/google/start"
              className="flex w-full items-center justify-center rounded-xl border border-white/15 px-4 py-3 font-semibold text-slate-100 transition hover:bg-white/5"
            >
              Continue with Google
            </a>
          </>
        )}

        {mode === "login" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("forgot");
              setPassword("");
              setError("");
              setMessage("");
            }}
            className="mt-5 block text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
          >
            Forgot your password?
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode(mode === "register" ? "login" : mode === "login" ? "register" : "login");
            setPassword("");
            setError("");
            setMessage("");
          }}
          className="mt-5 text-sm text-sky-300 hover:text-sky-200 disabled:opacity-50"
        >
          {mode === "login"
            ? "Don't have an account? Create one"
            : mode === "register"
              ? "Already have an account? Sign in"
              : "Back to sign in"}
        </button>
      </section>
    </main>

    <SiteFooter tone="dark" />
    </div>
  );
}