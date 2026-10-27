import type { Metadata } from "next";

import { PostIndex } from "@/components/guides/PostIndex";
import { BLOG_SECTION } from "@/components/guides/sections";
import { BLOG_POSTS } from "@/lib/blog";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Blog — ${SITE_NAME}`,
  description:
    "Longer pieces on protecting and tracking artwork online: how the tools work, what they miss, and how to use them honestly.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <PostIndex
      section={BLOG_SECTION}
      intro="Longer pieces on protecting and tracking artwork online: how the tools work, what they miss, and how to use them honestly."
      posts={BLOG_POSTS}
    />
  );
}
