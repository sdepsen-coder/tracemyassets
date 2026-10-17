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
import { useRouter } from "next/navigation";

import { BrandMark } from "@/components/app/brand";
import { GlassArt } from "@/components/app/GlassArt";
import { PasswordInput } from "@/components/auth/PasswordInput";
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
  /** The signed-in page. Not used when `landing` is given. */
  children?: ReactNode;
  /**
   * Optional public page shown instead of going straight to the sign-in
   * form. Signed-in visitors see it too (with their account menu), and a
   * password sign-in from it continues to Monitoring. Only "/" passes this.
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
  const router = useRouter();
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

    const wanted = params.get("auth");

    if (wanted === "register" || wanted === "login") {
      params.delete("auth");
      const rest = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (rest ? `?${rest}` : ""),
      );

      setMode(wanted);
      setScreen("auth");
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

        try {
          const user = await api.login(credentials);
          setPassword("");
          setSession(user);
          router.push("/protect");
        } catch {
          // Signing in can still be refused (for example while the address
          // must be confirmed first): fall back to the sign-in form.
          setMode("login");
          setPassword("");
          setMessage("Your account has been created. You can now sign in.");
        }
        return;
      }

      const user = await api.login(credentials);

      setPassword("");
      setSession(user);

      if (landing) {
        router.push("/monitoring");
      }
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
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 text-[var(--text-muted)]">
        <div className="max-w-md text-center">
          <p role={restoreError ? "alert" : "status"}>
            {checking ? "Checking your session..." : restoreError}
          </p>

          {!checking && restoreError && (
            <button
              type="button"
              onClick={() => setRestoreKey((value) => value + 1)}
              className="mt-4 inline-flex h-10 items-center rounded-full bg-[var(--primary-strong)] px-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)]"
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
        {error && (
          <p
            role="alert"
            className="bg-[var(--danger-soft)] px-4 py-2 text-center text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        )}

        {landing ?? children}
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
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--text)]">
    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
      <div className="grid w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-[var(--border)] lg:grid-cols-2">
        <aside className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <span aria-hidden className="iris absolute inset-0 opacity-60" />
          <div className="relative flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[12px] font-medium tracking-[0.32em] text-[#111111]">
              TRACEMYASSETS
            </span>
          </div>
          <div className="relative flex justify-center">
            <GlassArt motif="shield" />
          </div>
          <p className="relative font-heading text-[34px] font-light leading-[1.1] tracking-[-0.03em] text-[#111111]">
            Your art, watched over.
          </p>
        </aside>

        <section className="glass p-7 sm:p-12">
        {landing && (
          <button
            type="button"
            onClick={() => setScreen("landing")}
            className="mb-8 text-[13px] text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            &larr; Back to home
          </button>
        )}

        <h1 className="font-heading text-[40px] font-light leading-[1.05] tracking-[-0.03em]">
          {mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create your account"
                : "Reset your password"}
        </h1>

        <p className="mt-3 text-[15px] text-[var(--text-muted)]">
          {mode === "forgot"
            ? "Enter your email and we will send you a link to choose a new password."
            : mode === "register"
              ? "No credit card needed. You can protect your first artwork right after."
              : "Welcome back."}
        </p>

        {googleEnabled && mode !== "forgot" && (
          <>
            <a
              href="/api/v1/auth/google/start"
              className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--line-strong)] text-[12px] font-medium uppercase tracking-[0.08em] transition hover:bg-[var(--surface-muted)]"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              Continue with Google
            </a>
            <div className="my-6 flex items-center gap-3 text-[12px] text-[var(--text-muted)]">
              <span className="h-px flex-1 bg-[var(--border)]" />
              or
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className={googleEnabled && mode !== "forgot" ? "space-y-5" : "mt-8 space-y-5"}>
          <div>
            <label htmlFor="auth-email" className="label-caps text-[var(--text-muted)]">
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
              className="mt-2 h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[16px] outline-none focus:border-[var(--text)] disabled:opacity-50"
            />
          </div>

          {mode !== "forgot" && (
          <div>
            <label htmlFor="auth-password" className="label-caps text-[var(--text-muted)]">
              Password
            </label>
            <PasswordInput
              id="auth-password"
              name="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
              minLength={mode === "register" ? 8 : 1}
              maxLength={128}
              disabled={busy}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "register" && (
              <p className="mt-2 text-[13px] text-[var(--text-muted)]">
                At least 8 characters. Avoid common passwords like &quot;password123&quot;.
              </p>
            )}
          </div>
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
              className="block text-[13px] text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text)] hover:underline disabled:opacity-50"
            >
              Forgot your password?
            </button>
          )}

          {error && (
            <p
              role="alert"
              className="break-words rounded-xl bg-[var(--danger-soft)] p-3 text-[14px] text-[var(--danger)]"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-xl bg-[var(--success-soft)] p-3 text-[14px] text-[var(--success)]"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-full bg-[var(--primary-strong)] text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "register"
                  ? "Create account"
                  : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode(mode === "register" ? "login" : mode === "login" ? "register" : "login");
            setPassword("");
            setError("");
            setMessage("");
          }}
          className="mt-8 text-[14px] text-[var(--text-muted)] transition hover:text-[var(--text)] disabled:opacity-50"
        >
          {mode === "login"
            ? "New here? Create an account"
            : mode === "register"
              ? "Already have an account? Sign in"
              : "Back to sign in"}
        </button>
        </section>
      </div>
    </main>

    <SiteFooter />
    </div>
  );
}