import type { Metadata } from "next";

import type { Post } from "@/lib/guides";
import { SITE_NAME } from "@/lib/site";

/**
 * Search and social-preview metadata for a guide or blog post.
 *
 * A page that sets its own `openGraph` or `twitter` replaces the site-wide
 * values from the root layout (title, description and the preview image), so
 * everything a shared link needs is set here again, with the site's preview
 * image (app/opengraph-image.png).
 */
export function postMetadata(base: string, post: Post): Metadata {
  const title = `${post.title} — ${SITE_NAME}`;
  const path = `${base}/${post.slug}`;
  const images = [
    { url: "/opengraph-image.png", width: 1200, height: 630, alt: SITE_NAME },
  ];

  return {
    title,
    description: post.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title,
      description: post.description,
      url: path,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.description,
      images: ["/opengraph-image.png"],
    },
  };
}

/** Same idea for a section index page (/guides, /blog). */
export function indexMetadata(
  base: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: base },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: base,
      images: [
        { url: "/opengraph-image.png", width: 1200, height: 630, alt: SITE_NAME },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image.png"],
    },
  };
}
