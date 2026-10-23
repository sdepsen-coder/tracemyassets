import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { LegalPage } from "@/components/legal/LegalPage";
import { GUIDES } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Guides — ${SITE_NAME}`,
  description:
    "Plain answers for artists and photographers about finding copies of their work online, what an invisible watermark can and cannot do, and what to do next.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <LegalPage title="Guides">
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
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Plain answers about finding copies of your work online and what an
        invisible watermark can and cannot do, based on what we measured.
      </p>

      <ul className="space-y-4">
        {GUIDES.map((guide) => (
          <li
            key={guide.slug}
            className="glass rounded-card border border-[var(--border)] p-5"
          >
            <h2 className="text-[19px] font-medium leading-snug">
              <Link
                href={`/guides/${guide.slug}`}
                className="underline-offset-4 hover:underline"
              >
                {guide.title}
              </Link>
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-[var(--text-muted)]">
              {guide.description}
            </p>
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
