import Link from "next/link";

/** The logo mark: a shield with a tick on a dark glass tile with a cyan rim. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-xl border border-[var(--border-glow)] bg-[var(--primary-soft)]"
      style={{ width: size, height: size }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size * 0.54, height: size * 0.54 }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--primary)" />
        <path d="m9 12 2 2 4-4" stroke="var(--accent)" />
      </svg>
    </span>
  );
}

/** Logo mark plus the name. */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="TraceMyAssets home"
      className="flex shrink-0 items-center gap-2.5 text-[var(--text)]"
    >
      <BrandMark />
      <span className="font-heading text-[17px] font-bold tracking-[-0.02em]">
        TraceMyAssets
      </span>
    </Link>
  );
}
