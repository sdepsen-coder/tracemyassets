import type { MetadataRoute } from "next";

import { BLOG_POSTS } from "@/lib/blog";
import { GUIDES } from "@/lib/guides";
import { CONTENT_LAST_UPDATED, LEGAL_LAST_UPDATED, SITE_URL } from "@/lib/site";

const PAGES: { path: string; priority: number; legal?: boolean }[] = [
  { path: "/", priority: 1 },
  { path: "/pricing", priority: 0.8 },
  { path: "/help", priority: 0.7 },
  { path: "/for/etsy-sellers", priority: 0.6 },
  { path: "/for/photographers", priority: 0.6 },
  { path: "/for/illustrators", priority: 0.6 },
  { path: "/guides", priority: 0.7 },
  { path: "/blog", priority: 0.7 },
  { path: "/support", legal: true, priority: 0.5 },
  { path: "/privacy", legal: true, priority: 0.3 },
  { path: "/terms", legal: true, priority: 0.3 },
  { path: "/refunds", legal: true, priority: 0.3 },
];

function parseDate(value: string): Date | null {
  const date = new Date(`${value} 12:00 UTC`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const content = parseDate(CONTENT_LAST_UPDATED);
  const legal = parseDate(LEGAL_LAST_UPDATED);

  const pages = PAGES.map(({ path, priority, legal: isLegal }) => {
    const lastModified = isLegal ? legal : content;

    return {
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      ...(lastModified ? { lastModified } : {}),
      priority,
    };
  });

  const guides = GUIDES.map((guide) => {
    const lastModified = parseDate(guide.dateModified);

    return {
      url: `${SITE_URL}/guides/${guide.slug}`,
      ...(lastModified ? { lastModified } : {}),
      priority: 0.7,
    };
  });

  const blog = BLOG_POSTS.map((post) => {
    const lastModified = parseDate(post.dateModified);

    return {
      url: `${SITE_URL}/blog/${post.slug}`,
      ...(lastModified ? { lastModified } : {}),
      priority: 0.7,
    };
  });

  return [...pages, ...guides, ...blog];
}
