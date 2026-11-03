/**
 * Sends one Google Analytics event, only if the visitor has accepted
 * analytics. gtag exists only after Accept (see components/Analytics.tsx), so
 * without consent this does nothing. Never put personal data in `params`.
 *
 * gtag may appear a moment after the page's own code runs (the analytics
 * loader starts after the page), so a missing gtag is retried briefly and
 * then dropped. A visitor who has not accepted analytics is never tracked.
 */

type EventParams = Record<string, string | number | boolean | undefined>;

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

const RETRY_EVERY_MS = 250;
const RETRY_FOR_MS = 5000;

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;

  const started = Date.now();

  const attempt = () => {
    const gtag = (window as GtagWindow).gtag;

    if (gtag) {
      try {
        gtag("event", name, params);
      } catch {
        // Analytics must never break the page.
      }
      return;
    }

    if (Date.now() - started < RETRY_FOR_MS) {
      window.setTimeout(attempt, RETRY_EVERY_MS);
    }
  };

  attempt();
}

/**
 * Removes one query parameter from the address bar (without reloading), so a
 * one-time marker such as "?credits=success" is not counted again when the
 * page is refreshed.
 */
export function removeUrlParam(name: string): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  if (!params.has(name)) return;

  params.delete(name);
  const rest = params.toString();

  window.history.replaceState(
    null,
    "",
    window.location.pathname + (rest ? `?${rest}` : ""),
  );
}
