import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import { JsonLd } from "@/components/JsonLd";
import { getUseCase, USE_CASES } from "@/lib/useCases";
import { SITE_NAME, SITE_URL } from "@/lib/site";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return USE_CASES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const useCase = getUseCase((await params).slug);
  if (!useCase) return {};

  return {
    title: `${useCase.title} — ${SITE_NAME}`,
    description: useCase.description,
    alternates: { canonical: `/for/${useCase.slug}` },
  };
}

const CTA_CLASS =
  "inline-flex h-12 items-center justify-center rounded-full bg-[var(--primary-strong)] px-7 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85";

export default async function UseCasePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const useCase = getUseCase((await params).slug);
  if (!useCase) notFound();

  const url = `${SITE_URL}/for/${useCase.slug}`;

  return (
    <LegalPage title={useCase.title}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${url}#webpage`,
              url,
              name: `${useCase.title} — ${SITE_NAME}`,
              description: useCase.description,
              isPartOf: { "@id": `${SITE_URL}/#website` },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
                { "@type": "ListItem", position: 2, name: useCase.title, item: url },
              ],
            },
          ],
        }}
      />
      <div className="space-y-5">
        <p className="text-[18px] leading-8 text-[var(--text-muted)]">
          {useCase.lead}
        </p>
        <Link href="/?auth=register" className={CTA_CLASS}>
          Protect your first artwork — free
        </Link>
        <p className="text-[13px] text-[var(--text-muted)]">
          No credit card needed.
        </p>
      </div>

      <LegalSection heading="Why check">
        {useCase.why.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </LegalSection>

      <LegalSection heading="What you get">
        <LegalList
          items={[
            "Your original stays private. You get a protected copy with an invisible watermark to share instead.",
            "Automatic scans of the public web, daily on Pro and Extra, weekly or monthly on every plan.",
            "An email with a count and a link when a scheduled scan finds something new.",
            "Each match next to your original, with how strong it is. On paid plans you also see where it was found.",
            "You decide what to do. We never contact anyone on your behalf.",
          ]}
        />
      </LegalSection>

      <LegalSection heading={useCase.measuredHeading}>
        {useCase.measured.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          The tests used generated images, not real artwork. The full list of
          what the mark survives and what it does not is on the{" "}
          <Link href="/help" className="text-[var(--primary)] underline">
            Help page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What we cannot do">
        <LegalList
          items={[
            "We look only at public web pages that a search engine has indexed. Private groups, closed apps and some social networks are out of reach.",
            "A match is a possible match, never proof of copying or unlicensed use. You review it and decide.",
            "No match does not prove that no copy exists.",
            ...useCase.limits,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Plans">
        <p>
          The Free plan covers up to 3 artworks with no card. Pro and Extra
          add more artworks, daily scans, more Deep scan credits and the page where
          each match was found.{" "}
          <Link href="/pricing" className="text-[var(--primary)] underline">
            Compare the plans
          </Link>
          .
        </p>
      </LegalSection>

      {useCase.notice && (
        <p className="text-[12px] text-[var(--text-muted)]">{useCase.notice}</p>
      )}
    </LegalPage>
  );
}
