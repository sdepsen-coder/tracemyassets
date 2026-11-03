/**
 * Remembers, for this page visit only, the "?ref=" tag of the link that
 * brought the visitor here (for example "hearked-bluesky"), so it can be
 * sent along when they create an account.
 *
 * Kept in memory on purpose: nothing is written to cookies or browser
 * storage, so no consent is needed. The value survives moving between pages
 * of the site (the page is not reloaded) but not closing the tab. It is
 * only a short tag; nothing about the visitor is attached to it.
 */

const REF_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,79}$/;

let captured: string | undefined;

export function cleanSignupRef(value: string | null | undefined): string | undefined {
  const ref = (value ?? "").trim().toLowerCase();

  return REF_PATTERN.test(ref) ? ref : undefined;
}

/** Call with window.location.search. Keeps an earlier tag when there is none now. */
export function captureSignupRef(search: string): void {
  const ref = cleanSignupRef(new URLSearchParams(search).get("ref"));

  if (ref) {
    captured = ref;
  }
}

export function getSignupRef(): string | undefined {
  return captured;
}
