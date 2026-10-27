import type { Metadata } from "next";
import Link from "next/link";

import { GuideArt, ART_BG } from "@/components/guides/GuideArt";
import { GuideShell } from "@/components/guides/GuideShell";
import { JsonLd } from "@/components/JsonLd";
import { GUIDES, TOPIC_LABEL } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Guides — ${SITE_NAME}`,
  description:
    "Plain answers about finding copies of your artwork online, reporting them, and what an invisible watermark can and cannot do.",
  alternates: { canonical: "/guides" },
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function GuidesPage() {
  // Newest first; ties keep the order they are listed in.
  const sorted = [...GUIDES].sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished),
  );
  const [featured, ...rest] = sorted;

  return (
    <GuideShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
          ],
        }}
      />
      <div className="mx-auto w-full max-w-[1100px]">
        <h1 className="font-heading text-[44px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
          Guides
        </h1>
        <p className="mt-4 max-w-xl text-[18px] leading-8 text-[var(--text-muted)]">
          Finding copies of your artwork, reporting them, and what an invisible
          watermark can and cannot do.
        </p>

        {featured && (
          <Link
            href={`/guides/${featured.slug}`}
            className="mt-10 flex flex-wrap overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] transition hover:-translate-y-0.5"
          >
            <div
              className={`flex min-h-[220px] flex-[1_1_320px] items-center justify-center p-6 ${ART_BG[featured.topic]}`}
            >
              <GuideArt topic={featured.topic} className="h-40 w-auto" />
            </div>
            <div className="flex flex-[1.2_1_360px] flex-col justify-center p-6 sm:p-10">
              <p className="text-[13px] text-[var(--text-muted)]">
                {TOPIC_LABEL[featured.topic]} · {formatDate(featured.datePublished)}
              </p>
              <h2 className="mt-3 font-heading text-[28px] font-normal leading-tight tracking-[-0.02em] sm:text-[32px]">
                {featured.title}
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[var(--text-muted)]">
                {featured.description}
              </p>
              <p className="mt-5 text-[13px] font-medium">Read the guide →</p>
            </div>
          </Link>
        )}

        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/guides/${guide.slug}`}
                className="flex h-full flex-col rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5"
              >
                <div
                  className={`flex h-32 items-center justify-center rounded-2xl ${ART_BG[guide.topic]}`}
                >
                  <GuideArt topic={guide.topic} className="h-28 w-auto" />
                </div>
                <span className="mt-4 self-start rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em]">
                  {TOPIC_LABEL[guide.topic]}
                </span>
                <h2 className="mt-3 font-heading text-[20px] font-normal leading-snug tracking-[-0.01em]">
                  {guide.title}
                </h2>
                <p className="mt-auto pt-4 text-[13px] text-[var(--text-muted)]">
                  {formatDate(guide.datePublished)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </GuideShell>
  );
}
