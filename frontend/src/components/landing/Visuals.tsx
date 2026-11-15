import type { ReactNode } from "react";

import { Icon } from "@/components/dashboard/Icon";

import { ArtworkSample, type ArtName } from "./ArtworkSample";

/**
 * Pictures for the cards on the public pages. Each one is a small scene drawn
 * with generated artwork and the words the app itself uses; none of it is a
 * real result, which the landing page says under the hero. They are
 * decoration next to the card's own text, so screen readers skip them.
 */

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`visual-panel ${className}`}>
      {children}
    </div>
  );
}

/** Small mono label that sits on top of a picture. */
export function Tag({
  children,
  tone = "info",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger" | "plain";
  icon?: string;
  className?: string;
}) {
  const tones = {
    info: "border-[var(--border-glow)] bg-[rgb(0_210_255/0.12)] text-[var(--primary)]",
    success: "border-[rgb(52_211_153/0.4)] bg-[var(--success-soft)] text-[var(--success)]",
    warning: "border-[rgb(251_191_36/0.4)] bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "border-[rgb(251_113_133/0.4)] bg-[var(--danger-soft)] text-[var(--danger)]",
    plain: "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[10.5px] font-medium backdrop-blur ${tones} ${className}`}
    >
      {icon && <Icon name={icon} className="text-[14px]" />}
      {children}
    </span>
  );
}

function Frame({
  id,
  art,
  variant,
  className = "",
  imgClass = "",
  children,
}: {
  id: string;
  art: ArtName;
  variant?: "original" | "copy";
  className?: string;
  imgClass?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-white/15 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)] ${className}`}
    >
      <ArtworkSample id={id} art={art} variant={variant} className={`h-full w-full ${imgClass}`} />
      {children}
    </div>
  );
}

/** Original next to a cropped, recoloured copy, with the comparison result. */
export function CompareVisual({ className = "" }: { className?: string }) {
  return (
    <Panel className={`flex items-center justify-center gap-3 p-5 sm:gap-6 sm:p-8 ${className}`}>
      <div className="w-[38%] min-w-0">
        <Frame id="cmp-a" art="city" className="aspect-[4/3]" />
        <p className="label-caps mt-2 text-[var(--text-muted)]">Yours</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-glow)] bg-[var(--surface)] font-mono text-[13px] font-semibold text-[var(--accent)] shadow-[0_0_24px_-4px_rgb(0_245_212/0.6)] sm:h-14 sm:w-14">
          94%
        </span>
        <span className="hidden font-mono text-[10px] text-[var(--text-muted)] sm:block">similar</span>
      </div>
      <div className="w-[38%] min-w-0">
        <Frame id="cmp-b" art="city" variant="copy" className="aspect-[4/3] border-[var(--border-glow)]" imgClass="scale-[1.35]">
          <span className="scan-beam pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[rgb(0_210_255/0.35)] to-transparent" />
        </Frame>
        <p className="label-caps mt-2 text-[var(--primary)]">Found online</p>
      </div>
      <Tag tone="warning" icon="compare" className="absolute left-3 top-3">
        Cropped and recoloured
      </Tag>
      <Tag tone="success" icon="check" className="absolute bottom-3 right-3">
        Strong match
      </Tag>
    </Panel>
  );
}

/** The facts shown with a match, and a ready-written message to copy. */
export function EvidenceVisual({ className = "" }: { className?: string }) {
  const rows = [
    { icon: "globe", label: "Where", value: "shop.example.com/listing/4821" },
    { icon: "compare", label: "Strength", value: "Strong match · 94%" },
    { icon: "fingerprint", label: "Watermark", value: "Not found (resized copy)" },
  ];

  return (
    <Panel className={`flex flex-col justify-center gap-3 p-5 sm:p-6 ${className}`}>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2.5 border-b border-[var(--border)] py-2 last:border-0">
            <Icon name={row.icon} className="text-[16px] text-[var(--primary)]" />
            <span className="w-[74px] shrink-0 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {row.label}
            </span>
            <span className="truncate text-[12.5px] text-[var(--text)]">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Message to the shop
          </span>
          <Tag tone="info" icon="download">Copy text</Tag>
        </div>
        <div className="mt-3 space-y-1.5">
          <span className="block h-1.5 w-11/12 rounded-full bg-[var(--surface-strong)]" />
          <span className="block h-1.5 w-full rounded-full bg-[var(--surface-strong)]" />
          <span className="block h-1.5 w-8/12 rounded-full bg-[var(--surface-strong)]" />
        </div>
      </div>
    </Panel>
  );
}

/** A picture in the middle of rings that reach out to public pages. */
export function RadarVisual({
  art = "hills",
  tag,
  className = "",
}: {
  art?: ArtName;
  tag: string;
  className?: string;
}) {
  return (
    <Panel className={`flex items-center justify-center ${className}`}>
      {[0, 1.2, 2.4].map((delay) => (
        <span
          key={delay}
          className="radar-ring absolute h-[230px] w-[230px] rounded-full border border-[var(--primary)]"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
      <span className="absolute h-[150px] w-[150px] rounded-full border border-dashed border-[var(--border-glow)]" />
      <Frame id={`radar-${art}`} art={art} className="relative z-10 h-[84px] w-[112px]" />
      <span className="absolute left-[12%] top-[22%] h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_2px_rgb(0_245_212/0.7)]" />
      <span className="absolute right-[16%] top-[30%] h-2 w-2 rounded-full bg-[var(--primary)] shadow-[0_0_12px_2px_rgb(0_210_255/0.7)]" />
      <span className="absolute bottom-[26%] right-[24%] h-2 w-2 rounded-full bg-[var(--warning)] shadow-[0_0_12px_2px_rgb(251_191_36/0.6)]" />
      <Tag tone="info" className="absolute bottom-3 left-3">{tag}</Tag>
    </Panel>
  );
}

/** A picture under a lens: the exact-match search. */
export function LensVisual({ tag, className = "" }: { tag: string; className?: string }) {
  return (
    <Panel className={`flex items-center justify-center ${className}`}>
      <Frame id="lens-bg" art="botanic" className="h-[78%] w-[62%] opacity-40 blur-[2px]" />
      <div className="absolute h-[118px] w-[118px] overflow-hidden rounded-full border-2 border-[var(--primary)] shadow-[0_0_30px_-4px_rgb(0_210_255/0.8)]">
        <ArtworkSample id="lens-fg" art="botanic" className="h-full w-full scale-[1.9]" />
      </div>
      <span className="absolute h-[52px] w-[5px] translate-x-[62px] translate-y-[62px] -rotate-45 rounded-full bg-[var(--primary)]" />
      <Tag tone="info" className="absolute bottom-3 left-3">{tag}</Tag>
    </Panel>
  );
}

/** Three shop listings, one of them carrying the artist's picture. */
export function ShopsVisual({ className = "" }: { className?: string }) {
  const items: Array<{ art: ArtName; hit?: boolean }> = [
    { art: "shapes" },
    { art: "botanic", hit: true },
    { art: "hills" },
  ];

  return (
    <Panel className={`flex items-center justify-center gap-2.5 p-4 ${className}`}>
      {items.map((item) => (
        <div
          key={item.art}
          className={`w-[30%] rounded-lg border bg-[var(--surface)] p-1.5 ${item.hit ? "border-[var(--border-glow)] shadow-[0_0_22px_-6px_rgb(0_210_255/0.7)]" : "border-[var(--border)] opacity-70"}`}
        >
          <Frame id={`shop-${item.art}`} art={item.art} variant={item.hit ? "copy" : "original"} className="aspect-square" />
          <span className="mt-2 block h-1.5 w-10/12 rounded-full bg-[var(--surface-strong)]" />
          <span className="mt-1.5 block h-1.5 w-6/12 rounded-full bg-[var(--surface-strong)]" />
        </div>
      ))}
      <Tag tone="warning" className="absolute bottom-3 left-3">Possible copy</Tag>
    </Panel>
  );
}

/** The artist's catalogue: a row of protected pictures. */
export function GalleryStrip({ className = "" }: { className?: string }) {
  const arts: ArtName[] = ["city", "botanic", "hills", "shapes"];

  return (
    <div aria-hidden="true" className={`grid grid-cols-4 gap-2 ${className}`}>
      {arts.map((art) => (
        <Frame key={art} id={`strip-${art}`} art={art} className="aspect-square" />
      ))}
    </div>
  );
}
