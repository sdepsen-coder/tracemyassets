import type {
  CreditsInfo,
  MonitoringPreference,
  UsageInfo,
} from "@/lib/api";

export type Frequency = MonitoringPreference["scan_frequency"];

export const FREQUENCY_DAYS: Record<Frequency, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** The server enforces this too (app/core/plan_limits.py); Free has no daily. */
export function allowsDaily(planType: string): boolean {
  return planType !== "Free";
}

export const DEFAULT_THRESHOLD = 80;

export function formatShortDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** "2 days ago" style label for a past date. */
export function timeAgo(value: string): string {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);

  if (Number.isNaN(days)) return "—";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}

/**
 * When the scheduler will next pick this artwork up, or null when automatic
 * scans are off. A first scan is due straight away.
 */
export function nextScanDate(preference: MonitoringPreference): Date | null {
  if (!preference.enabled) return null;
  if (!preference.last_scan_at) return new Date();

  const due = new Date(preference.last_scan_at);
  due.setDate(due.getDate() + FREQUENCY_DAYS[preference.scan_frequency]);

  return due;
}

export function nextScanLabel(preference: MonitoringPreference): string {
  const due = nextScanDate(preference);

  if (!due) return "Auto-scan off";
  if (due.getTime() <= Date.now()) return "Next: soon";

  return `Next: ${due.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })}`;
}

/** Hand-started Standard scans left this month; null means no limit. */
export function standardScansLeft(usage: UsageInfo | null): number | null {
  if (!usage || usage.manual_scans.limit === null) return null;
  return Math.max(0, usage.manual_scans.remaining ?? 0);
}

export function standardScanCost(usage: UsageInfo | null): string {
  if (!usage) return "Uses 1 of your monthly scans";

  const { limit } = usage.manual_scans;
  const left = standardScansLeft(usage);

  if (limit === null || left === null) return "Included in your plan";
  if (left === 0) {
    return `No scans left this month · resets ${formatShortDate(
      usage.manual_scans.resets_on,
    )}`;
  }

  return `Uses 1 of your ${limit} monthly scans · ${left} left`;
}

export function deepScanCost(credits: CreditsInfo | null): string {
  if (!credits) return "Uses 1 Deep scan credit";

  const cost = credits.deep_scan_cost;
  const unit = cost === 1 ? "credit" : "credits";

  if (credits.balance < cost) return "No Deep scan credits left";

  return `Uses ${cost} Deep scan ${unit} · ${credits.balance} left`;
}
