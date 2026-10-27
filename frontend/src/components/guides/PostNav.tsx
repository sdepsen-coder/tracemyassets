import Link from "next/link";

import { TOPIC_LABEL, type Post } from "@/lib/guides";

/**
 * Side list of the other posts in the same section (guides or blog), with the
 * current one marked. Newest first.
 */
export function PostNav({
  title,
  allLabel,
  base,
  posts,
  currentSlug,
}: {
  title: string;
  /** Text of the link to the section's index, e.g. "All guides". */
  allLabel: string;
  base: string;
  posts: Post[];
  currentSlug: string;
}) {
  const sorted = [...posts].sort((a, b) =>
    b.datePublished.localeCompare(a.datePublished),
  );

  return (
    <nav aria-label={title}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {title}
      </p>
      <ul className="mt-3 space-y-3 border-l border-[var(--border)] pl-4">
        {sorted.map((post) => {
          const current = post.slug === currentSlug;
          return (
            <li key={post.slug}>
              <Link
                href={`${base}/${post.slug}`}
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "block text-[14px] font-medium leading-snug text-[var(--text)]"
                    : "block text-[14px] leading-snug text-[var(--text-muted)] hover:text-[var(--text)]"
                }
              >
                {post.title}
                <span className="mt-0.5 block text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {TOPIC_LABEL[post.topic]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={base}
        className="mt-4 inline-block text-[13px] text-[var(--primary)] underline underline-offset-4"
      >
        {allLabel}
      </Link>
    </nav>
  );
}
