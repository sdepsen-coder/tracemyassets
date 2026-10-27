/**
 * Metadata for the /guides pages. The text of each guide is a component in
 * components/guides (registered in app/guides/[slug]/page.tsx), so a guide can
 * reuse the site's diagrams.
 *
 * Rules for guides (same as the rest of the site): say only what is measured
 * in docs/test-results.md or visible in the code, say "copies" and
 * "unlicensed use", keep limits next to strengths, and no invented numbers.
 */
export type GuideTopic = "report" | "evidence" | "find" | "next" | "mark";

export const TOPIC_LABEL: Record<GuideTopic, string> = {
  report: "Reporting",
  evidence: "Evidence",
  find: "Finding copies",
  next: "Next steps",
  mark: "Watermark",
};

export type Guide = {
  slug: string;
  /** Picks the small illustration and the label on cards. */
  topic: GuideTopic;
  /** Page title (also the H1). A question or a clear statement. */
  title: string;
  /** Meta description and the short text on the index page. */
  description: string;
  /** ISO dates, for the Article structured data and the sitemap. */
  datePublished: string;
  dateModified: string;
  /** Slugs of related guides, shown at the end of the page. */
  related?: string[];
  /**
   * Questions for FAQPage structured data. The same questions and answers
   * must be visible on the page (Google requires it).
   */
  faq?: { q: string; a: string }[];
};

/** Guides and blog posts share one shape. */
export type Post = Guide;

export const GUIDES: Guide[] = [
  {
    slug: "what-an-invisible-watermark-survives",
    topic: "mark",
    title: "What an invisible watermark survives: our measured results",
    description:
      "Which edits keep an invisible watermark readable and which remove it: PNG, JPEG, WEBP, resizing, cropping, rotating and colour changes, measured on test images.",
    datePublished: "2026-10-23",
    dateModified: "2026-10-23",
    related: ["how-to-check-if-your-artwork-was-reposted"],
  },
  {
    slug: "how-to-check-if-your-artwork-was-reposted",
    topic: "find",
    title: "How to check whether your artwork was reposted without permission",
    description:
      "A free, step-by-step way to look for copies of your artwork online: search by image with more than one tool, search by words, judge what you find, and keep a record.",
    datePublished: "2026-10-23",
    dateModified: "2026-10-23",
    related: [
      "what-to-do-when-you-find-a-copy-of-your-artwork",
      "what-an-invisible-watermark-survives",
    ],
  },
  {
    slug: "what-to-do-when-you-find-a-copy-of-your-artwork",
    topic: "next",
    title: "What to do when you find a copy of your artwork",
    description:
      "A calm order of steps: look first, keep evidence, start with the gentlest step, then the platform, then the host, and when to ask a professional. Practical help, not legal advice.",
    datePublished: "2026-10-23",
    dateModified: "2026-10-23",
    related: [
      "how-to-check-if-your-artwork-was-reposted",
      "what-an-invisible-watermark-survives",
    ],
  },
  {
    slug: "what-happens-to-a-photo-when-it-is-resized-or-cropped",
    topic: "mark",
    title: "What happens to a photo when it is resized or cropped",
    description:
      "Measured on test images: resizing and cropping remove an invisible watermark, and a table of which edited copies were still recognised by how they look and which were missed.",
    datePublished: "2026-10-23",
    dateModified: "2026-10-23",
    related: [
      "what-an-invisible-watermark-survives",
      "how-to-check-if-your-artwork-was-reposted",
    ],
  },
  {
    slug: "how-to-file-a-dmca-takedown-on-etsy",
    topic: "report",
    title: "How to file a DMCA takedown on Etsy for a copy of your artwork",
    description:
      "Someone is selling your art on Etsy? What an Etsy DMCA notice must contain, where to send it and what happens next, step by step. General information, not legal advice.",
    datePublished: "2026-10-27",
    dateModified: "2026-10-27",
    related: [
      "what-to-do-when-you-find-a-copy-of-your-artwork",
      "how-to-prove-you-made-your-artwork",
    ],
  },
  {
    slug: "found-your-artwork-on-temu-redbubble-or-amazon",
    topic: "report",
    title: "Found your artwork on Temu, Redbubble or Amazon? What to do",
    description:
      "How to report copies of your artwork on Temu, Redbubble and Amazon: who can file, what to include and how the DMCA process works. General information, not legal advice.",
    datePublished: "2026-10-27",
    dateModified: "2026-10-27",
    related: [
      "how-to-file-a-dmca-takedown-on-etsy",
      "how-to-prove-you-made-your-artwork",
    ],
  },
  {
    slug: "how-to-prove-you-made-your-artwork",
    topic: "evidence",
    title: "How to prove you made your artwork",
    description:
      "Practical ways artists can document authorship: source files, dated records, first publication and registration, so a takedown is easy to back up.",
    datePublished: "2026-10-27",
    dateModified: "2026-10-27",
    related: [
      "how-to-file-a-dmca-takedown-on-etsy",
      "what-to-do-when-you-find-a-copy-of-your-artwork",
    ],
    faq: [
      {
        q: "Do I have to register my copyright to file a takedown?",
        a: "A DMCA takedown does not require registration. It requires that you own the work or are authorised to act for the owner. Registration matters more if you later want to sue, and the rules differ by country.",
      },
      {
        q: "What is the best single piece of evidence?",
        a: "Your layered or working source file with its timestamps, ideally backed by a dated public first post.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
