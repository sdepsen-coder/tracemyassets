"use client";

import { ANALYTICS_ENABLED } from "@/lib/site";

import { OPEN_COOKIE_SETTINGS_EVENT } from "./Analytics";

/** Footer link that reopens the cookie banner. Hidden when analytics is off. */
export function CookieSettingsLink({ className }: { className?: string }) {
  if (!ANALYTICS_ENABLED) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
      }
    >
      Cookie settings
    </button>
  );
}
