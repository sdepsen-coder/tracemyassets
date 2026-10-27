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
    related: [],
  },
];

export function getBlogPost(slug: string): Post | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
