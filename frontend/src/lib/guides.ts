/**
 * Metadata for the /guides pages. The text of each guide is a component in
 * components/guides (registered in app/guides/[slug]/page.tsx), so a guide can
 * reuse the site's diagrams.
 *
 * Rules for guides (same as the rest of the site): say only what is measured
 * in docs/test-results.md or visible in the code, say "copies" and
 * "unlicensed use", keep limits next to strengths, and no invented numbers.
 */
export type Guide = {
  slug: string;
  /** Page title (also the H1). A question or a clear statement. */
  title: string;
  /** Meta description and the short text on the index page. */
  description: string;
  /** ISO dates, for the Article structured data and the sitemap. */
  datePublished: string;
  dateModified: string;
  /** Slugs of related guides, shown at the end of the page. */
  related?: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "what-an-invisible-watermark-survives",
    title: "What an invisible watermark survives: our measured results",
    description:
      "Which edits keep an invisible watermark readable and which remove it: PNG, JPEG, WEBP, resizing, cropping, rotating and colour changes, measured on test images.",
    datePublished: "2026-10-23",
    dateModified: "2026-10-23",
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
