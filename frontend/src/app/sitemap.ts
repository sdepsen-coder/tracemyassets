import type { MetadataRoute } from "next";

import { LEGAL_LAST_UPDATED, SITE_URL } from "@/lib/site";

const PAGES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/about", priority: 0.8 },
  { path: "/pricing", priority: 0.8 },
  { path: "/help", priority: 0.7 },
  { path: "/support", priority: 0.5 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/refunds", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(`${LEGAL_LAST_UPDATED} 12:00 UTC`);
  const valid = !Number.isNaN(lastModified.getTime());

  return PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    ...(valid ? { lastModified } : {}),
    priority,
  }));
}
