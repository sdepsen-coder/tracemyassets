/**
 * Site-wide public constants.
 *
 * NEXT_PUBLIC_CONTACT_EMAIL is inlined at build time (Next.js), so set it
 * on the frontend service *before* the build/deploy. When it is unset the
 * footer and Support page simply omit the address rather than showing a
 * placeholder -- but Etsy's API Terms (section 1) require a prominently
 * displayed contact address, so it must be set before Etsy scanning goes
 * live.
 */
export const SITE_NAME = "TraceMyAssets";

export const CONTACT_EMAIL: string =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? "";

/**
 * Notice required verbatim by Etsy's API Terms of Use, section 2
 * ("Attribution"): it must be displayed prominently on the application.
 */
export const ETSY_TRADEMARK_NOTICE =
  "The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc.";

export const LEGAL_LAST_UPDATED = "6 October 2026";
