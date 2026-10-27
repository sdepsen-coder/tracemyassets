import Link from "next/link";

import { GuideArt, ART_BG } from "@/components/guides/GuideArt";
import { GuideShell } from "@/components/guides/GuideShell";
import type { Section } from "@/components/guides/sections";
import { JsonLd } from "@/components/JsonLd";
import { TOPIC_LABEL, type Post } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Index of a section: newest post large, the rest as cards. */
export function PostIndex({
  section,
  intro,
  posts,
}: {
  section: Section;
  intro: string;
  posts: Post[];
}) {
  // Newest first; ties keep the order they are listed in.
  const sorted = [...posts].sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished),
  );
  const [featured, ...rest] = sorted;

  return (
    <GuideShell active={section.key}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
            {
              "@type": "ListItem",
              position: 2,
              name: section.label,
              item: `${SITE_URL}${section.base}`,
            },
          ],
        }}
      />
      <div className="mx-auto w-full max-w-[1100px]">
        <h1 className="font-heading text-[44px] font-light leading-[1.05] tracking-[-0.03em] sm:text-[64px]">
          {section.label}
        </h1>
        <p className="mt-4 max-w-xl text-[18px] leading-8 text-[var(--text-muted)]">
          {intro}
        </p>

        {featured && (
          <Link
            href={`${section.base}/${featured.slug}`}
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
              <p className="mt-5 text-[13px] font-medium">Read more →</p>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`${section.base}/${post.slug}`}
                  className="flex h-full flex-col rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5"
                >
                  <div
                    className={`flex h-32 items-center justify-center rounded-2xl ${ART_BG[post.topic]}`}
                  >
                    <GuideArt topic={post.topic} className="h-28 w-auto" />
                  </div>
                  <span className="mt-4 self-start rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.1em]">
                    {TOPIC_LABEL[post.topic]}
                  </span>
                  <h2 className="mt-3 font-heading text-[20px] font-normal leading-snug tracking-[-0.01em]">
                    {post.title}
                  </h2>
                  <p className="mt-auto pt-4 text-[13px] text-[var(--text-muted)]">
                    {formatDate(post.datePublished)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GuideShell>
  );
}
