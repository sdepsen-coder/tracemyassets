import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

import { AiTrainingEvidencePost } from "@/components/blog/AiTrainingEvidencePost";
import { PodReappearPost } from "@/components/blog/PodReappearPost";
import { UkEuTakedownPost } from "@/components/blog/UkEuTakedownPost";
import { ThreeWaysToFindCopiesPost } from "@/components/blog/ThreeWaysToFindCopiesPost";
import { PostPage } from "@/components/guides/PostPage";
import { BLOG_SECTION } from "@/components/guides/sections";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog";
import { postMetadata } from "@/lib/postMetadata";

type Params = { slug: string };

/** The text of each post. Add a post here and in lib/blog.ts. */
const BODIES: Record<string, ComponentType> = {
  "three-ways-to-find-copies-of-your-artwork": ThreeWaysToFindCopiesPost,
  "ai-training-and-your-art-what-the-evidence-says": AiTrainingEvidencePost,
  "taking-down-a-copy-of-your-art-in-the-uk-and-eu": UkEuTakedownPost,
  "why-stolen-art-keeps-reappearing-on-print-on-demand-sites": PodReappearPost,
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

  return postMetadata("/blog", post);
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
