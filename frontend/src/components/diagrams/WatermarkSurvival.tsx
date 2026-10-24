import { useId } from "react";

import { Diagram, ResponsivePair } from "./primitives";

/**
 * Built from Table 1 of docs/test-results.md (plus the hue and sepia rows
 * noted under it). If a result there changes, change it here and in the
 * Help and landing copy in the same commit.
 */
type Outcome = "kept" | "lost" | "untested";
type Item = { label: string; outcome: Outcome; detail?: string };
type Group = { title: string; items: Item[] };

export const SURVIVAL_GROUPS: Group[] = [
  {
    title: "Saved in another format",
    items: [
      { label: "PNG, lossless", outcome: "kept" },
      { label: "WEBP, lossless", outcome: "kept" },
      { label: "JPEG quality 95", outcome: "kept" },
      { label: "JPEG quality 85", outcome: "kept" },
      { label: "WEBP quality 90", outcome: "kept" },
      { label: "JPEG quality 70", outcome: "lost" },
      { label: "JPEG quality 50", outcome: "lost" },
      { label: "WEBP quality 75", outcome: "lost" },
    ],
  },
  {
    title: "Colour changes",
    items: [
      { label: "Contrast +20%", outcome: "kept" },
      { label: "Black and white", outcome: "kept" },
      { label: "Hue shift", outcome: "kept" },
      { label: "Sepia tone", outcome: "kept" },
      { label: "Brightness +20%", outcome: "lost" },
    ],
  },
  {
    title: "Size and shape",
    items: [
      { label: "Resize to 75%", outcome: "lost" },
      { label: "Resize to 50%", outcome: "lost" },
      { label: "Resize to 25%", outcome: "lost" },
      { label: "Enlarge 2x", outcome: "lost" },
      { label: "Crop to 90%", outcome: "lost", detail: "centred or off the 8 px block grid" },
      { label: "Crop to 50%", outcome: "lost" },
      { label: "Rotate 1 degree", outcome: "lost" },
      { label: "Rotate 90 degrees", outcome: "lost" },
      { label: "Mirror", outcome: "lost" },
    ],
  },
  {
    title: "Screenshot-like",
    items: [{ label: "Half size, then JPEG quality 80", outcome: "lost" }],
  },
  {
    title: "Re-created with AI tools",
    items: [
      {
        label: "Image re-created with an AI tool",
        outcome: "untested",
        detail: "a known way marks like this can be removed; not tested by us",
      },
    ],
  },
];

const OUTCOME_WORD: Record<Outcome, string> = {
  kept: "mark still readable",
  lost: "mark lost",
  untested: "not tested",
};

const SEG_GAP = 3;
const GROUP_GAP = 11;

type StripLayout = { segW: number; segH: number; maxWidth: number; groupRows?: boolean };
const WIDE_STRIP: StripLayout = { segW: 14, segH: 34, maxWidth: 1000 };
/** Phone: fewer, larger boxes per row so the tick and cross marks stay readable. */
const NARROW_STRIP: StripLayout = { segW: 22, segH: 30, maxWidth: 300, groupRows: true };

/** Flow the boxes left to right, wrapping when a row is full. */
function layoutStrip({ segW, segH, maxWidth, groupRows }: StripLayout) {
  const boxes: { x: number; y: number; item: Item; key: string }[] = [];
  let x = 0;
  let y = 0;
  let width = 0;
  SURVIVAL_GROUPS.forEach((group, gi) => {
    if (gi > 0) {
      if (groupRows && group.items.length > 1) {
        x = 0;
        y += segH + SEG_GAP + 2;
      } else {
        x += GROUP_GAP - SEG_GAP;
      }
    }
    group.items.forEach((item, ii) => {
      if (x > 0 && x + segW > maxWidth) {
        x = 0;
        y += segH + SEG_GAP + 2;
      }
      boxes.push({ x, y, item, key: `${gi}-${ii}` });
      width = Math.max(width, x + segW);
      x += segW + SEG_GAP;
    });
  });
  return { boxes, width, height: y + segH };
}

function Strip({ uid, layout }: { uid: string; layout: StripLayout }) {
  const { segW, segH } = layout;
  const { boxes, width, height } = layoutStrip(layout);
  const segments = boxes.map(({ x, y, item, key }) => {
    const cx = x + segW / 2;
    const cy = y + segH / 2;
    const arm = segW * 0.22;
    return (
      <g key={key}>
        <title>{`${item.label}: ${OUTCOME_WORD[item.outcome]}`}</title>
        <rect
          x={x}
          y={y}
          width={segW}
          height={segH}
          rx={4}
          strokeWidth={1.25}
          strokeDasharray={item.outcome === "untested" ? "3 2.5" : undefined}
          className={
            item.outcome === "kept"
              ? "fill-[var(--success-soft)] stroke-[var(--success)]"
              : item.outcome === "lost"
                ? "fill-[var(--danger-soft)] stroke-[var(--danger)]"
                : "fill-[var(--surface-muted)] stroke-[var(--line-strong)]"
          }
        />
        {item.outcome === "kept" && (
          <path
            d={`M${cx - arm} ${cy} l${arm * 0.75} ${arm * 0.8} l${arm * 1.25} -${arm * 1.55}`}
            fill="none"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-[var(--success)]"
          />
        )}
        {item.outcome === "lost" && (
          <path
            d={`M${cx - arm} ${cy - arm} l${arm * 2} ${arm * 2} M${cx + arm} ${cy - arm} l-${arm * 2} ${arm * 2}`}
            fill="none"
            strokeWidth={1.8}
            strokeLinecap="round"
            className="stroke-[var(--danger)]"
          />
        )}
        {item.outcome === "untested" && (
          <text x={cx} y={cy + 5} fontSize={14} textAnchor="middle" className="fill-[var(--text-muted)]">
            ?
          </text>
        )}
      </g>
    );
  });

  return (
    <Diagram
      viewBox={[width + 2, height + 2]}
      title="What the invisible mark survives"
      description="One box per tested edit, in groups. Green boxes with a tick: the mark could still be read. Red boxes with a cross: the mark was lost. Dashed grey box with a question mark: not tested. It survived lossless saving, high-quality JPEG and WEBP, contrast and colour changes. It was lost on resizing, cropping, rotating, mirroring, a brightness change, stronger compression and screenshot-like copies."
      titleId={`${uid}-s`}
    >
      <g transform="translate(1 1)">{segments}</g>
    </Diagram>
  );
}

function Legend() {
  const base = "inline-flex items-center gap-1.5";
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[var(--text-muted)]">
      <li className={base}>
        <span aria-hidden="true" className="text-[var(--success)]">✓</span>
        Mark still readable
      </li>
      <li className={base}>
        <span aria-hidden="true" className="text-[var(--danger)]">✕</span>
        Mark lost
      </li>
      <li className={base}>
        <span aria-hidden="true">?</span>
        Not tested
      </li>
    </ul>
  );
}

function Chip({ item }: { item: Item }) {
  const style =
    item.outcome === "kept"
      ? "border-[var(--success)]/40 bg-[var(--success-soft)]"
      : item.outcome === "lost"
        ? "border-[var(--danger)]/40 bg-[var(--danger-soft)]"
        : "border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)]";
  const mark = item.outcome === "kept" ? "✓" : item.outcome === "lost" ? "✕" : "?";
  const markColour =
    item.outcome === "kept"
      ? "text-[var(--success)]"
      : item.outcome === "lost"
        ? "text-[var(--danger)]"
        : "text-[var(--text-muted)]";
  return (
    <li className={`${item.outcome === "untested" ? "col-span-2" : ""} flex items-start gap-1.5 rounded-xl border px-2.5 py-2 text-[13.5px] leading-5 sm:gap-2 sm:px-3 sm:text-[14px] text-[var(--text)] ${style}`}>
      <span aria-hidden="true" className={`mt-px font-medium ${markColour}`}>
        {mark}
      </span>
      <span>
        {item.label}
        <span className="sr-only">: {OUTCOME_WORD[item.outcome]}</span>
        {item.detail && (
          <span className="block text-[12.5px] text-[var(--text)]">{item.detail}</span>
        )}
      </span>
    </li>
  );
}

/**
 * "What the mark survives". `compact` is the strip with a short legend
 * (landing page); the full version adds every tested edit by name (Help).
 */
export function WatermarkSurvival({ compact = false }: { compact?: boolean }) {
  const uid = useId().replace(/:/g, "");
  return (
    <figure>
      <ResponsivePair
        breakpoint="sm"
        wideMax={460}
        narrowMax={340}
        wide={<Strip uid={`${uid}w`} layout={WIDE_STRIP} />}
        narrow={<Strip uid={`${uid}n`} layout={NARROW_STRIP} />}
      />
      <Legend />
      {!compact && (
        <div className="mt-5 grid gap-5">
          {SURVIVAL_GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {group.title}
              </h3>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <Chip key={item.label} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <figcaption className="mt-4 text-[13px] leading-5 text-[var(--text-muted)]">
        Measured on three generated test images, not real artwork, so treat it
        as a guide. Edits and quality settings we did not test are unknown.
      </figcaption>
    </figure>
  );
}
