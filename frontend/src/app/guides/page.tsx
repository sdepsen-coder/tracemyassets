import type { Metadata } from "next";

import { PostIndex } from "@/components/guides/PostIndex";
import { GUIDES_SECTION } from "@/components/guides/sections";
import { GUIDES } from "@/lib/guides";
import { indexMetadata } from "@/lib/postMetadata";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = indexMetadata(
  "/guides",
  `Guides — ${SITE_NAME}`,
  "Short, practical steps for finding copies of your artwork online, reporting them, and understanding what an invisible watermark can and cannot do.",
);

export default function GuidesPage() {
  return (
    <PostIndex
      section={GUIDES_SECTION}
      intro="Short, practical steps: finding copies of your artwork, reporting them, and what an invisible watermark can and cannot do."
      posts={GUIDES}
    />
  );
}
