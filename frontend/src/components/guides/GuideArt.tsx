import type { GuideTopic } from "@/lib/guides";

/**
 * Small original illustrations, one per guide topic. They follow the site
 * colours (CSS variables) so they work in light and dark mode. Decorative
 * only: not a real result and not a real artwork.
 */
const OUT = "stroke-[var(--text)] fill-none";
const PAPER = "fill-[var(--surface)] stroke-[var(--text)]";

export function GuideArt({
  topic,
  className = "",
}: {
  topic: GuideTopic;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 120"
      aria-hidden="true"
      className={className}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {topic === "report" && (
        <>
          <rect x="62" y="14" width="76" height="94" rx="8" className={PAPER} />
          <rect x="74" y="30" width="40" height="5" rx="2.5" className="fill-[var(--text)]" stroke="none" />
          <rect x="74" y="44" width="52" height="4" rx="2" fill="#bdbab2" stroke="none" />
          <rect x="74" y="54" width="52" height="4" rx="2" fill="#bdbab2" stroke="none" />
          <rect x="74" y="64" width="34" height="4" rx="2" fill="#bdbab2" stroke="none" />
          <circle cx="130" cy="88" r="20" fill="#c9c3f5" className="stroke-[var(--text)]" />
          <path d="M121 88l6 6 12-13" className={OUT} strokeWidth={3} />
        </>
      )}
      {topic === "evidence" && (
        <>
          <rect x="54" y="44" width="92" height="58" rx="8" fill="#e8e6e0" className="stroke-[var(--text)]" />
          <rect x="62" y="32" width="92" height="58" rx="8" fill="#bfd9f7" className="stroke-[var(--text)]" />
          <rect x="70" y="20" width="92" height="58" rx="8" className={PAPER} />
          <circle cx="92" cy="40" r="7" fill="#f3e9f7" className="stroke-[var(--text)]" />
          <path d="M76 70l20-18 14 12 12-9 16 15" className={OUT} />
          <circle cx="150" cy="92" r="16" className={PAPER} />
          <path d="M150 82v10l7 4" className={OUT} />
        </>
      )}
      {topic === "find" && (
        <>
          <rect x="40" y="20" width="90" height="72" rx="8" className={PAPER} />
          <circle cx="64" cy="42" r="8" fill="#f3e9f7" className="stroke-[var(--text)]" />
          <path d="M46 84l28-26 18 15 14-11 18 22" fill="#bfd9f7" className="stroke-[var(--text)]" />
          <circle cx="130" cy="70" r="26" fill="rgba(201,195,245,.55)" className="stroke-[var(--text)]" strokeWidth={3} />
          <path d="M149 89l22 22" className={OUT} strokeWidth={5} />
        </>
      )}
      {topic === "next" && (
        <>
          <rect x="30" y="76" width="44" height="30" rx="6" fill="#e8e6e0" className="stroke-[var(--text)]" />
          <rect x="78" y="54" width="44" height="52" rx="6" fill="#bfd9f7" className="stroke-[var(--text)]" />
          <rect x="126" y="32" width="44" height="74" rx="6" fill="#c9c3f5" className="stroke-[var(--text)]" />
          <path d="M40 62c24 0 36-16 46-34M76 22l12 4-4 12" className={OUT} strokeWidth={2.5} />
        </>
      )}
      {topic === "mark" && (
        <>
          <rect x="44" y="16" width="112" height="88" rx="10" className={PAPER} />
          <path d="M52 92l32-30 22 18 18-14 24 26z" fill="#bfd9f7" className="stroke-[var(--text)]" />
          <circle cx="76" cy="40" r="9" fill="#f3e9f7" className="stroke-[var(--text)]" />
          <g className="fill-[var(--text)] opacity-50" stroke="none">
            {[30, 46, 62].flatMap((y, row) =>
              [70, 86, 102, 118, 134].map((x) => (
                <circle key={`${row}-${x}`} cx={x + (row === 1 ? 8 : 0)} cy={y} r="1.6" />
              )),
            )}
          </g>
        </>
      )}
    </svg>
  );
}

/** Soft coloured panel the illustration sits on. */
export const ART_BG: Record<GuideTopic, string> = {
  report: "bg-[#ecebf6] dark:bg-[#26243a]",
  evidence: "bg-[#e6eef8] dark:bg-[#1c2a3a]",
  find: "bg-[#f3eaf6] dark:bg-[#33263a]",
  next: "bg-[var(--success-soft)]",
  mark: "bg-[var(--warning-soft)]",
};
