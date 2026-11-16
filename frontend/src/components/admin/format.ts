export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  // Server timestamps are UTC; ones without an offset are treated as UTC.
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(value);
  const date = new Date(hasZone ? value : `${value}Z`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const EVENT_LABELS: Record<string, string> = {
  register: "Sign-up",
  login: "Signed in",
  login_failed: "Failed sign-in",
  google_signup: "Google sign-up",
  google_login: "Google sign-in",
  password_reset_requested: "Reset requested",
  password_reset_done: "Password reset",
  logout_all: "Signed out everywhere",
  asset_uploaded: "Artwork uploaded",
  scan: "Scan",
  deep_scan: "Deep scan",
  feedback: "Feedback",
  admin_action: "Admin action",
};

export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type;
}

/** Severity colour for an event type, using the app's theme tokens. */
export function eventTone(type: string): string {
  if (type === "login_failed") {
    return "bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  if (type === "admin_action") {
    return "bg-[var(--warning-soft)] text-[var(--warning)]";
  }

  if (type === "register" || type === "google_signup") {
    return "bg-[var(--success-soft)] text-[var(--success)]";
  }

  return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
}

/**
 * Money in the lowest unit of its currency (cents for USD), as Paddle
 * reports it, shown in the currency's own format.
 */
export function formatMoney(minor: number, currency: string): string {
  if (!currency) return String(minor);

  try {
    const format = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    });
    const digits = format.resolvedOptions().maximumFractionDigits ?? 2;

    return format.format(minor / 10 ** digits);
  } catch {
    return `${minor} ${currency}`;
  }
}

export const SUBSCRIPTION_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment failed",
  paused: "Paused",
  canceled: "Canceled",
};

export function subscriptionLabel(status: string | null): string {
  if (!status) return "None";

  return SUBSCRIPTION_LABELS[status] ?? status;
}

/** Colour for a subscription state; a scheduled cancel counts as a warning. */
export function subscriptionTone(
  status: string | null,
  cancelling = false,
): string {
  if (status === "past_due") {
    return "bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  if (cancelling || status === "paused") {
    return "bg-[var(--warning-soft)] text-[var(--warning)]";
  }

  if (status === "active" || status === "trialing") {
    return "bg-[var(--success-soft)] text-[var(--success)]";
  }

  return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
}

/**
 * What happened with an artwork's scans, in one short line. "0 matches after
 * 2 scans" and "no scan yet" are different situations, and a failed last scan
 * is not the same as a clean one that found nothing.
 */
export function scanSummary(
  scans: number,
  matches: number,
  lastStatus?: string | null,
): { text: string; tone: "good" | "none" | "warn" | "muted" } {
  if (lastStatus === "failed") {
    return {
      text:
        scans > 0
          ? `Last scan failed · ${matches} found in ${scans} earlier`
          : "Scan failed",
      tone: "warn",
    };
  }

  if (scans === 0) {
    return {
      text:
        lastStatus === "queued" || lastStatus === "running"
          ? "Scan running"
          : "Not scanned yet",
      tone: "muted",
    };
  }

  const scanWord = scans === 1 ? "scan" : "scans";

  if (matches > 0) {
    return {
      text: `${matches} ${matches === 1 ? "match" : "matches"} · ${scans} ${scanWord}`,
      tone: "good",
    };
  }

  return { text: `No matches · ${scans} ${scanWord}`, tone: "none" };
}

export const SCAN_TONE: Record<"good" | "none" | "warn" | "muted", string> = {
  good: "text-[var(--success)]",
  none: "text-[var(--text-muted)]",
  warn: "text-[var(--warning)]",
  muted: "text-[var(--text-muted)]",
};
