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
 * Trademark line for where the site names Etsy. We do not use the Etsy API
 * (copies on Etsy are found through search engines only). If an Etsy API
 * integration ever goes live, Etsy's API Terms (section 2, "Attribution")
 * require their own notice to be shown prominently: replace this then.
 */
export const ETSY_TRADEMARK_NOTICE =
  "Etsy is a trademark of Etsy, Inc. TraceMyAssets is not affiliated with or endorsed by Etsy.";

export const LEGAL_LAST_UPDATED = "10 October 2026";

/**
 * When the public marketing and help pages last changed in a way worth telling
 * search engines (sitemap lastModified). Update it by hand when those pages
 * change; the legal pages use LEGAL_LAST_UPDATED.
 */
export const CONTENT_LAST_UPDATED = "27 October 2026";

/**
 * Who runs the service. These are inlined at build time, so set them on
 * the frontend service before the build. Paddle (and UK law for a sole
 * trader using a trading name) expect the legal name and an address on the
 * Terms. Nothing personal is kept in the repository: when both are unset
 * the sentence is simply left out.
 */
export const LEGAL_NAME: string =
  process.env.NEXT_PUBLIC_LEGAL_NAME?.trim() ?? "";
export const LEGAL_ADDRESS: string =
  process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() ?? "";

/**
 * Public address of the site, used for canonical links, the sitemap and
 * social previews. NEXT_PUBLIC_* values are inlined at build time.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://tracemyassets.com"
).replace(/\/+$/, "");

export const SITE_DESCRIPTION =
  "Register your artwork, create protected copies with an invisible watermark, and review possible online copies. You decide what to do; we never contact anyone for you.";

/** Google Analytics 4 measurement ID (G-XXXX). Empty = analytics is off. */
export const GA_ID: string = process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "";

/** Microsoft Clarity project ID. Empty = Clarity is off. */
export const CLARITY_ID: string =
  process.env.NEXT_PUBLIC_CLARITY_ID?.trim() ?? "";

/** True when any optional analytics is configured (shows the cookie banner). */
export const ANALYTICS_ENABLED: boolean = Boolean(GA_ID || CLARITY_ID);

/**
 * Pages where Clarity may record: public marketing and content pages only.
 * Signed-in pages (artworks, matches, account, admin) are never recorded.
 */
const CLARITY_PUBLIC_PREFIXES = [
  "/pricing",
  "/guides",
  "/blog",
  "/about",
  "/for",
  "/help",
];

export function isClarityPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return CLARITY_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Optional Google Search Console HTML-tag verification token. */
export const SEARCH_CONSOLE_TOKEN: string =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ?? "";
