import Link from "next/link";

import { Icon } from "@/components/dashboard/Icon";

/** The small iridescent glass tile with a shield, used as the logo mark. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="iris relative flex shrink-0 items-center justify-center rounded-[10px] border border-white/70 text-[#111111] shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]"
      style={{ width: size, height: size }}
    >
      <Icon name="shield" className="text-[18px]" />
    </span>
  );
}

/** Logo mark plus the spaced uppercase wordmark. */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2.5 text-[var(--text)]">
      <BrandMark />
      <span className="hidden text-[12px] font-medium tracking-[0.32em] sm:block">
        TRACEMYASSETS
      </span>
    </Link>
  );
}
