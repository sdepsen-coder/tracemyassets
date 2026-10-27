import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

import { AiTrainingEvidencePost } from "@/components/blog/AiTrainingEvidencePost";
import { ThreeWaysToFindCopiesPost } from "@/components/blog/ThreeWaysToFindCopiesPost";
import { PostPage } from "@/components/guides/PostPage";
import { BLOG_SECTION } from "@/components/guides/sections";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { SITE_NAME } from "@/lib/site";

type Params = { slug: string };

/** The text of each post. Add a post here and in lib/blog.ts. */
const BODIES: Record<string, ComponentType> = {
  "three-ways-to-find-copies-of-your-artwork": ThreeWaysToFindCopiesPost,
  "ai-training-and-your-art-what-the-evidence-says": AiTrainingEvidencePost,
};

export function generateStaticParams(): Params[] {
  return BLOG_POSTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const post = getBlogPost((await params).slug);
  if (!post) return {};

  return {
    title: `${post.title} — ${SITE_NAME}`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const post = getBlogPost((await params).slug);
  const Body = post ? BODIES[post.slug] : undefined;
  if (!post || !Body) notFound();

  return (
    <PostPage section={BLOG_SECTION} post={post} posts={BLOG_POSTS} Body={Body} />
  );
}
