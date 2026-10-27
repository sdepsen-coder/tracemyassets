import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

import { CheckIfRepostedGuide } from "@/components/guides/CheckIfRepostedGuide";
import { CounterNoticeGuide } from "@/components/guides/CounterNoticeGuide";
import { EtsyDmcaGuide } from "@/components/guides/EtsyDmcaGuide";
import { FoundACopyGuide } from "@/components/guides/FoundACopyGuide";
import { MarketplaceCopiesGuide } from "@/components/guides/MarketplaceCopiesGuide";
import { PhotoResizedCroppedGuide } from "@/components/guides/PhotoResizedCroppedGuide";
import { ProveAuthorshipGuide } from "@/components/guides/ProveAuthorshipGuide";
import { StopAiTrainingGuide } from "@/components/guides/StopAiTrainingGuide";
import { TineyeFirstPostedGuide } from "@/components/guides/TineyeFirstPostedGuide";
import { WatermarkSurvivesGuide } from "@/components/guides/WatermarkSurvivesGuide";
import { PostPage } from "@/components/guides/PostPage";
import { GUIDES_SECTION } from "@/components/guides/sections";
import { getGuide, GUIDES } from "@/lib/guides";
import { SITE_NAME } from "@/lib/site";

type Params = { slug: string };

/** The text of each guide. Add a guide here and in lib/guides.ts. */
const BODIES: Record<string, ComponentType> = {
  "what-an-invisible-watermark-survives": WatermarkSurvivesGuide,
  "how-to-check-if-your-artwork-was-reposted": CheckIfRepostedGuide,
  "what-to-do-when-you-find-a-copy-of-your-artwork": FoundACopyGuide,
  "what-happens-to-a-photo-when-it-is-resized-or-cropped": PhotoResizedCroppedGuide,
  "how-to-file-a-dmca-takedown-on-etsy": EtsyDmcaGuide,
  "found-your-artwork-on-temu-redbubble-or-amazon": MarketplaceCopiesGuide,
  "how-to-prove-you-made-your-artwork": ProveAuthorshipGuide,
  "how-to-use-tineye-to-see-who-posted-your-artwork-first": TineyeFirstPostedGuide,
  "can-you-stop-ai-from-training-on-your-artwork": StopAiTrainingGuide,
  "what-to-do-if-a-seller-files-a-counter-notice": CounterNoticeGuide,
};

export function generateStaticParams(): Params[] {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};

  return {
    title: `${guide.title} — ${SITE_NAME}`,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: "article",
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const guide = getGuide((await params).slug);
  const Body = guide ? BODIES[guide.slug] : undefined;
  if (!guide || !Body) notFound();

  return (
    <PostPage section={GUIDES_SECTION} post={guide} posts={GUIDES} Body={Body} />
  );
}
