import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

import { CheckIfRepostedGuide } from "@/components/guides/CheckIfRepostedGuide";
import { EtsyDmcaGuide } from "@/components/guides/EtsyDmcaGuide";
import { FoundACopyGuide } from "@/components/guides/FoundACopyGuide";
import { MarketplaceCopiesGuide } from "@/components/guides/MarketplaceCopiesGuide";
import { PhotoResizedCroppedGuide } from "@/components/guides/PhotoResizedCroppedGuide";
import { ProveAuthorshipGuide } from "@/components/guides/ProveAuthorshipGuide";
import { WatermarkSurvivesGuide } from "@/components/guides/WatermarkSurvivesGuide";
import { JsonLd } from "@/components/JsonLd";
import { LegalPage } from "@/components/legal/LegalPage";
import { getGuide, GUIDES } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

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

const CTA_CLASS =
  "inline-flex h-12 items-center justify-center rounded-full bg-[var(--primary-strong)] px-7 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85";

export default async function GuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const guide = getGuide((await params).slug);
  const Body = guide ? BODIES[guide.slug] : undefined;
  if (!guide || !Body) notFound();

  const url = `${SITE_URL}/guides/${guide.slug}`;
  const related = (guide.related ?? [])
    .map((slug) => getGuide(slug))
    .filter((item) => item !== undefined);

  return (
    <LegalPage title={guide.title}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${url}#article`,
              headline: guide.title,
              description: guide.description,
              datePublished: guide.datePublished,
              dateModified: guide.dateModified,
              mainEntityOfPage: url,
              author: { "@id": `${SITE_URL}/#organization` },
              publisher: { "@id": `${SITE_URL}/#organization` },
            },
            ...(guide.faq
              ? [
                  {
                    "@type": "FAQPage",
                    "@id": `${url}#faq`,
                    mainEntity: guide.faq.map(({ q, a }) => ({
                      "@type": "Question",
                      name: q,
                      acceptedAnswer: { "@type": "Answer", text: a },
                    })),
                  },
                ]
              : []),
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
                { "@type": "ListItem", position: 3, name: guide.title, item: url },
              ],
            },
          ],
        }}
      />

      <p className="text-[13px] text-[var(--text-muted)]">
        <Link href="/guides" className="underline underline-offset-4">
          Guides
        </Link>{" "}
        · Updated{" "}
        {new Date(`${guide.dateModified}T12:00:00Z`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}
      </p>

      <Body />

      {related.length > 0 && (
        <section>
          <h2 className="font-heading text-[26px] font-light tracking-[-0.02em]">
            Related guides
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px]">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/guides/${item.slug}`}
                  className="text-[var(--primary)] underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <Link href="/?auth=register" className={CTA_CLASS}>
          Protect your first artwork — free
        </Link>
        <p className="text-[13px] text-[var(--text-muted)]">
          No credit card needed.
        </p>
      </div>
    </LegalPage>
  );
}
