import type { ReactNode } from "react";

/**
 * Shared pieces for the explanatory diagrams. Everything is inline SVG that
 * takes its colours from the site's CSS variables, so light and dark mode
 * work without extra code. Text stays real <text> (selectable, translatable,
 * readable by screen readers).
 */

/** Shows one layout from `breakpoint` up and the other below it. */
export function ResponsivePair({
  breakpoint,
  wide,
  narrow,
  wideMax,
  narrowMax = 460,
}: {
  breakpoint: "sm" | "lg";
  wide: ReactNode;
  narrow: ReactNode;
  wideMax: number;
  narrowMax?: number;
}) {
  const show = {
    sm: { narrow: "sm:hidden", wide: "hidden sm:block" },
    lg: { narrow: "lg:hidden", wide: "hidden lg:block" },
  }[breakpoint];

  return (
    <>
      <div className={`mx-auto w-full ${show.narrow}`} style={{ maxWidth: narrowMax }}>
        {narrow}
      </div>
      <div className={`mx-auto w-full ${show.wide}`} style={{ maxWidth: wideMax }}>
        {wide}
      </div>
    </>
  );
}

/** Root <svg>: scales with its container, announces itself with a title. */
export function Diagram({
  viewBox,
  title,
  description,
  titleId,
  children,
}: {
  viewBox: [number, number];
  title: string;
  description: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${viewBox[0]} ${viewBox[1]}`}
      role="img"
      aria-labelledby={`${titleId}-t ${titleId}-d`}
      className="block h-auto w-full"
      fontFamily="inherit"
    >
      <title id={`${titleId}-t`}>{title}</title>
      <desc id={`${titleId}-d`}>{description}</desc>
      {children}
    </svg>
  );
}

/** The iris gradient from globals.css (`--iris`), as SVG stops per theme. */
export function IrisGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" className="[stop-color:#c9c3f5] dark:[stop-color:#4b4382]" />
      <stop offset="0.55" className="[stop-color:#bfd9f7] dark:[stop-color:#2f5a86]" />
      <stop offset="1" className="[stop-color:#f3e9f7] dark:[stop-color:#6a4d73]" />
    </linearGradient>
  );
}

/** Multi-line real text. Pass one string per line. */
export function Lines({
  x,
  y,
  lines,
  size = 14,
  lineHeight,
  weight = 400,
  anchor = "start",
  muted = false,
  caps = false,
}: {
  x: number;
  y: number;
  lines: string[];
  size?: number;
  lineHeight?: number;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  muted?: boolean;
  caps?: boolean;
}) {
  const step = lineHeight ?? Math.round(size * 1.3);
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      letterSpacing={caps ? size * 0.08 : undefined}
      className={muted ? "fill-[var(--text-muted)]" : "fill-[var(--text)]"}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : step}>
          {caps ? line.toUpperCase() : line}
        </tspan>
      ))}
    </text>
  );
}

/** Glass-like card: soft fill, thin border. */
export function Panel({
  x,
  y,
  width,
  height,
  tone = "plain",
  radius = 18,
  irisId,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  tone?: "plain" | "iris" | "dashed";
  radius?: number;
  /** Id of an <IrisGradient/> in the same svg; needed for tone "iris". */
  irisId?: string;
}) {
  const className = {
    plain: "fill-[var(--surface)] stroke-[var(--border)]",
    iris: "stroke-[var(--line-strong)]",
    dashed: "fill-[var(--surface-muted)] stroke-[var(--line-strong)]",
  }[tone];
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={radius}
      strokeWidth={1.25}
      strokeDasharray={tone === "dashed" ? "6 5" : undefined}
      className={className}
      fill={tone === "iris" && irisId ? `url(#${irisId})` : undefined}
    />
  );
}

/** Arrow from (x1,y1) to (x2,y2) with a small filled head. */
export function Arrow({
  from,
  to,
  curve,
}: {
  from: [number, number];
  to: [number, number];
  /** Optional cubic control points for a bent connector. */
  curve?: [[number, number], [number, number]];
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const ctrl: [number, number] = curve ? curve[1] : [x1, y1];
  const angle = Math.atan2(y2 - ctrl[1], x2 - ctrl[0]);
  const len = 9;
  const spread = 0.5;
  const a = [x2 - len * Math.cos(angle - spread), y2 - len * Math.sin(angle - spread)];
  const b = [x2 - len * Math.cos(angle + spread), y2 - len * Math.sin(angle + spread)];
  // Stop the line a little short so it does not poke through the head.
  const sx = x2 - 6 * Math.cos(angle);
  const sy = y2 - 6 * Math.sin(angle);
  const d = curve
    ? `M${x1} ${y1} C${curve[0][0]} ${curve[0][1]} ${curve[1][0]} ${curve[1][1]} ${sx} ${sy}`
    : `M${x1} ${y1} L${sx} ${sy}`;
  return (
    <g aria-hidden="true">
      <path d={d} fill="none" strokeWidth={1.75} strokeLinecap="round" className="stroke-[var(--text-muted)]" />
      <path d={`M${x2} ${y2} L${a[0]} ${a[1]} L${b[0]} ${b[1]} Z`} className="fill-[var(--text-muted)]" />
    </g>
  );
}

const ICONS = {
  artwork: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </>
  ),
  protected: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <circle cx="9.5" cy="11" r="0.9" />
      <circle cx="14.5" cy="11" r="0.9" />
      <circle cx="12" cy="14.5" r="0.9" />
    </>
  ),
  online: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18" />
      <path d="M7 17l3-3 2.5 2.5 2-2 2.5 2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5.5 5.5" />
    </>
  ),
  compare: (
    <>
      <rect x="2.5" y="6" width="9" height="12" rx="1.8" />
      <rect x="12.5" y="6" width="9" height="12" rx="1.8" />
      <path d="M6 12.5l1.8 1.8 3-3.4" />
    </>
  ),
  review: (
    <>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </>
  ),
  lens: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5V6M12 18v2.5M3.5 12H6M18 12h2.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

/** 24 x 24 outline icon drawn at (x, y) with the given pixel size. */
export function SvgIcon({
  name,
  x,
  y,
  size = 24,
}: {
  name: IconName;
  x: number;
  y: number;
  size?: number;
}) {
  return (
    <g
      aria-hidden="true"
      transform={`translate(${x} ${y}) scale(${size / 24})`}
      fill="none"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-[var(--text)]"
    >
      {ICONS[name]}
    </g>
  );
}

/** Round badge holding an icon, centred on (cx, cy). */
export function IconBadge({
  cx,
  cy,
  r = 24,
  icon,
  tone,
  irisId,
}: {
  cx: number;
  cy: number;
  r?: number;
  icon: IconName;
  tone: "iris" | "plain";
  irisId: string;
}) {
  const size = Math.round(r * 1.0);
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        strokeWidth={1.25}
        className={tone === "plain" ? "fill-[var(--surface-muted)] stroke-[var(--border)]" : "stroke-[var(--line-strong)]"}
        fill={tone === "iris" ? `url(#${irisId})` : undefined}
      />
      <SvgIcon name={icon} x={cx - size / 2} y={cy - size / 2} size={size} />
    </g>
  );
}

/** Card wrapper used around a diagram on the pages. */
export function DiagramCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure
      className={`glass rounded-card border border-[var(--border)] p-4 sm:p-7 ${className}`}
    >
      {children}
    </figure>
  );
}
