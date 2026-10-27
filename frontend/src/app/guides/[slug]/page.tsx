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
import { GuideArt, ART_BG } from "@/components/guides/GuideArt";
import { GuideShell } from "@/components/guides/GuideShell";
import { GuideToc } from "@/components/guides/GuideToc";
import { JsonLd } from "@/components/JsonLd";
import { getGuide, GUIDES, TOPIC_LABEL } from "@/lib/guides";
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
    <GuideShell>
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

      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-start gap-x-14 gap-y-8">
        <article className="min-w-0 flex-[999_1_560px] space-y-10 lg:max-w-[720px]">
          <header>
            <p className="text-[13px] text-[var(--text-muted)]">
              <Link href="/guides" className="underline underline-offset-4">
                Guides
              </Link>{" "}
              · {TOPIC_LABEL[guide.topic]} · Updated{" "}
              {new Date(`${guide.dateModified}T12:00:00Z`).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <h1 className="mt-4 font-heading text-[36px] font-light leading-[1.1] tracking-[-0.03em] sm:text-[48px]">
              {guide.title}
            </h1>
            <div
              className={`mt-8 flex h-44 items-center justify-center rounded-[24px] border border-[var(--border)] ${ART_BG[guide.topic]}`}
            >
              <GuideArt topic={guide.topic} className="h-36 w-auto" />
            </div>
          </header>

          <div data-guide-body className="space-y-10">
            <Body />
          </div>

          {related.length > 0 && (
            <section>
              <h2 className="font-heading text-[26px] font-light tracking-[-0.02em]">
                Related guides
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/guides/${item.slug}`}
                      className="glass flex h-full flex-col gap-3 rounded-card border border-[var(--border)] p-4 transition hover:-translate-y-0.5"
                    >
                      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
                        {TOPIC_LABEL[item.topic]}
                      </span>
                      <span className="text-[16px] leading-snug">{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div
            className="rounded-[24px] p-6 sm:p-8"
            style={{ background: "var(--iris)" }}
          >
            <h2 className="font-heading text-[24px] font-normal tracking-[-0.02em] text-[#111]">
              Protect your first artwork
            </h2>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[#3b3a37]">
              Register it, add an invisible watermark and review possible copies.
              You decide what to do. No credit card needed.
            </p>
            <Link href="/?auth=register" className={`mt-5 ${CTA_CLASS}`}>
              Start free
            </Link>
          </div>
        </article>

        <aside className="hidden min-w-[200px] flex-[1_1_200px] lg:sticky lg:top-28 lg:block">
          <GuideToc />
        </aside>
      </div>
    </GuideShell>
  );
}
