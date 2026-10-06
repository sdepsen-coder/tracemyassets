"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { GA_ID } from "@/lib/site";

/**
 * Optional Google Analytics 4 behind a consent banner.
 *
 * - Off entirely unless NEXT_PUBLIC_GA_ID is set at build time.
 * - Nothing from Google is loaded, and no analytics cookie is written,
 *   until the visitor presses Accept (Consent Mode v2: analytics_storage
 *   and all ad storage stay "denied").
 * - The choice is kept in localStorage; "Cookie settings" in the footer
 *   reopens the banner. The admin area is never tracked.
 */

const STORAGE_KEY = "tma_cookie_consent";
export const OPEN_COOKIE_SETTINGS_EVENT = "tma:open-cookie-settings";

type Choice = "granted" | "denied";

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean | undefined;
};

function gw(): GtagWindow {
  return window as unknown as GtagWindow;
}

function readChoice(): Choice | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function saveChoice(choice: Choice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage can be blocked; the choice then lasts for this visit only.
  }
}

function clearAnalyticsCookies() {
  const host = window.location.hostname;
  const domains = [host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];

  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();

    if (name && (name === "_ga" || name.startsWith("_ga_"))) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
      }
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

function loadGoogleAnalytics() {
  const w = gw();

  w[`ga-disable-${GA_ID}`] = false;

  if (w.gtag) {
    w.gtag("consent", "update", { analytics_storage: "granted" });
    return;
  }

  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // gtag.js needs the real `arguments` object, not a rest array.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };

  w.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  w.gtag("js", new Date());
  w.gtag("config", GA_ID, {
    send_page_view: false,
    anonymize_ip: true,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

function stopGoogleAnalytics() {
  const w = gw();

  w[`ga-disable-${GA_ID}`] = true;
  w.gtag?.("consent", "update", { analytics_storage: "denied" });
  clearAnalyticsCookies();
}

export function Analytics() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [ready, setReady] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);

  // Read the stored choice after hydration.
  useEffect(() => {
    if (!GA_ID) return;

    const stored = readChoice();
    setChoice(stored);
    setBannerOpen(stored === null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!GA_ID) return;

    const reopen = () => setBannerOpen(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  // Load or stop analytics when the choice changes.
  useEffect(() => {
    if (!GA_ID || !ready) return;

    if (choice === "granted") {
      loadGoogleAnalytics();
    } else if (choice === "denied") {
      stopGoogleAnalytics();
    }
  }, [choice, ready]);

  // One page_view per route, never for the admin area.
  useEffect(() => {
    if (!GA_ID || choice !== "granted" || !pathname) return;
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return;

    gw().gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [choice, pathname]);

  const decide = useCallback((next: Choice) => {
    saveChoice(next);
    setChoice(next);
    setBannerOpen(false);
  }, []);

  if (!GA_ID || !ready || !bannerOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      data-testid="cookie-banner"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[13px] leading-relaxed text-[var(--text)] shadow-2xl sm:flex-row sm:items-center sm:gap-5">
        <p className="flex-1 text-[var(--text-muted)]">
          We would like to use Google Analytics cookies to see which pages are
          useful and to fix what is not. Nothing is loaded unless you accept.
          Signing in needs only a session cookie, which is always on. See our{" "}
          <a href="/privacy" className="underline hover:text-[var(--text)]">
            Privacy page
          </a>
          .
        </p>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            data-testid="cookie-decline"
            onClick={() => decide("denied")}
            className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
          >
            Decline
          </button>
          <button
            type="button"
            data-testid="cookie-accept"
            onClick={() => decide("granted")}
            className="rounded-lg bg-[var(--accent,#2563eb)] px-4 py-2 font-semibold text-white transition hover:opacity-90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
