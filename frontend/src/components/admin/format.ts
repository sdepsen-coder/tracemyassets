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
