/**
 * Metadata for the /blog posts. The blog is for longer, deeper pieces: how
 * things work and what they cannot do, with limits stated. The /guides pages
 * stay short how-to steps.
 *
 * Same rules as the rest of the site: say only what is measured in
 * docs/test-results.md or visible in the code, say "copies" and "unlicensed
 * use", keep limits next to strengths, and no invented numbers, people or
 * quotes. The text of each post is a component in components/blog, registered
 * in app/blog/[slug]/page.tsx.
 */
import type { Post } from "@/lib/guides";

export const BLOG_POSTS: Post[] = [
  {
    slug: "three-ways-to-find-copies-of-your-artwork",
    topic: "find",
    title: "Three ways to find copies of your artwork, and what each one misses",
    description:
      "Reverse image search, an invisible watermark and scheduled monitoring all find different things. What each is good at, where each fails, and how to combine them without false confidence.",
    datePublished: "2026-10-27",
    dateModified: "2026-10-27",
    related: ["ai-training-and-your-art-what-the-evidence-says"],
  },
  {
    slug: "ai-training-and-your-art-what-the-evidence-says",
    topic: "next",
    title: "AI training and your art: what the evidence says about opting out",
    description:
      "Crawler blocks, image-altering tools and the law are three different defences with three different weak points. What researchers and regulators have actually said, with sources and dates.",
    datePublished: "2026-10-27",
    dateModified: "2026-10-27",
    related: ["three-ways-to-find-copies-of-your-artwork"],
  },
  {
    slug: "taking-down-a-copy-of-your-art-in-the-uk-and-eu",
    topic: "report",
    title: "Taking down a copy of your art in the UK and EU: what replaces the DMCA",
    description:
      "The DMCA is a US law. What the UK's 2002 e-commerce rules and the EU Digital Services Act actually say about notices to hosts, how they differ, and what that means for an individual artist.",
    datePublished: "2026-10-28",
    dateModified: "2026-10-28",
    related: [
      "three-ways-to-find-copies-of-your-artwork",
      "ai-training-and-your-art-what-the-evidence-says",
    ],
  },
  {
    slug: "why-stolen-art-keeps-reappearing-on-print-on-demand-sites",
    topic: "find",
    title: "Why stolen art keeps reappearing on print-on-demand sites",
    description:
      "You report a listing and it comes back from another shop. How print-on-demand selling works, what Etsy, Redbubble and Temu say about repeat sellers, and a realistic routine for keeping up.",
    datePublished: "2026-10-28",
    dateModified: "2026-10-28",
    related: [
      "taking-down-a-copy-of-your-art-in-the-uk-and-eu",
      "three-ways-to-find-copies-of-your-artwork",
    ],
  },
  {
    slug: "google-alerts-for-images",
    topic: "find",
    title: "Google Alerts for images: how to get notified when your art appears online",
    description:
      "Google Alerts follows search terms, not uploaded images. How to combine a reverse image search with a repeatable routine or scheduled scans, and what an image alert cannot tell you.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    related: [
      "three-ways-to-find-copies-of-your-artwork",
      "which-artworks-should-you-monitor-first",
    ],
  },
  {
    slug: "how-to-find-out-if-someone-is-selling-your-art-online",
    topic: "find",
    title: "How to find out if someone is selling your art online",
    description:
      "Start with your original, review possible matches, then read the listing behind each result and check your own permissions record. How to tell your own listings from unlicensed use, and what to save.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    related: [
      "why-stolen-art-keeps-reappearing-on-print-on-demand-sites",
      "google-alerts-for-images",
    ],
  },
  {
    slug: "which-artworks-should-you-monitor-first",
    topic: "find",
    title: "Which artworks should you monitor first? A practical guide for selling artists",
    description:
      "Choose a first monitoring list from previously copied work, bestsellers, current releases and licensed pieces, then turn it into a routine. A suggested order, not a risk score.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    related: [
      "google-alerts-for-images",
      "how-to-find-out-if-someone-is-selling-your-art-online",
    ],
  },
];

export function getBlogPost(slug: string): Post | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
