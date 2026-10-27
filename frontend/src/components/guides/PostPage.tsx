import Link from "next/link";
import type { ComponentType } from "react";

import { GuideArt, ART_BG } from "@/components/guides/GuideArt";
import { GuideShell } from "@/components/guides/GuideShell";
import { PostNav } from "@/components/guides/PostNav";
import type { Section } from "@/components/guides/sections";
import { JsonLd } from "@/components/JsonLd";
import { TOPIC_LABEL, type Post } from "@/lib/guides";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const CTA_CLASS =
  "inline-flex h-12 items-center justify-center rounded-full bg-[var(--primary-strong)] px-7 text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--on-primary)] transition hover:opacity-85";

/**
 * One guide or blog post: header with illustration, the text, related posts,
 * a call to action, and a side list of the other posts in the same section.
 */
export function PostPage({
  section,
  post,
  posts,
  Body,
}: {
  section: Section;
  post: Post;
  /** Every post in this section, for the side list. */
  posts: Post[];
  Body: ComponentType;
}) {
  const url = `${SITE_URL}${section.base}/${post.slug}`;
  const related = (post.related ?? [])
    .map((slug) => posts.find((item) => item.slug === slug))
    .filter((item) => item !== undefined);

  return (
    <GuideShell active={section.key}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              "@id": `${url}#article`,
              headline: post.title,
              description: post.description,
              datePublished: post.datePublished,
              dateModified: post.dateModified,
              mainEntityOfPage: url,
              author: { "@id": `${SITE_URL}/#organization` },
              publisher: { "@id": `${SITE_URL}/#organization` },
            },
            ...(post.faq
              ? [
                  {
                    "@type": "FAQPage",
                    "@id": `${url}#faq`,
                    mainEntity: post.faq.map(({ q, a }) => ({
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
                {
                  "@type": "ListItem",
                  position: 2,
                  name: section.label,
                  item: `${SITE_URL}${section.base}`,
                },
                { "@type": "ListItem", position: 3, name: post.title, item: url },
              ],
            },
          ],
        }}
      />

      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-start gap-x-14 gap-y-8">
        <article className="min-w-0 flex-[999_1_560px] space-y-10 lg:max-w-[720px]">
          <header>
            <p className="text-[13px] text-[var(--text-muted)]">
              <Link href={section.base} className="underline underline-offset-4">
                {section.label}
              </Link>{" "}
              · {TOPIC_LABEL[post.topic]} · Updated{" "}
              {new Date(`${post.dateModified}T12:00:00Z`).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
            <h1 className="mt-4 font-heading text-[36px] font-light leading-[1.1] tracking-[-0.03em] sm:text-[48px]">
              {post.title}
            </h1>
            <div
              className={`mt-8 flex h-44 items-center justify-center rounded-[24px] border border-[var(--border)] ${ART_BG[post.topic]}`}
            >
              <GuideArt topic={post.topic} className="h-36 w-auto" />
            </div>
          </header>

          <div className="space-y-10">
            <Body />
          </div>

          {related.length > 0 && (
            <section>
              <h2 className="font-heading text-[26px] font-light tracking-[-0.02em]">
                Related reading
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`${section.base}/${item.slug}`}
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

          <div className="rounded-[24px] p-6 sm:p-8" style={{ background: "var(--iris)" }}>
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

        <aside className="min-w-[200px] flex-[1_1_200px] lg:sticky lg:top-28">
          <PostNav
            title={section.sideTitle}
            allLabel={section.allLabel}
            base={section.base}
            posts={posts}
            currentSlug={post.slug}
          />
        </aside>
      </div>
    </GuideShell>
  );
}
