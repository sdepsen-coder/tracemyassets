import { Icon } from "@/components/dashboard/Icon";

import { ArtworkSample } from "./ArtworkSample";

/**
 * What a match looks like in the app, drawn with generated artwork: the
 * visitor sees the product instead of an abstract picture. It uses the same
 * words as the real Matches page ("Yours", "Strong match", the watermark
 * note) and says below that it is an illustration, not a real result.
 */
export function MatchPreview({ className = "" }: { className?: string }) {
  return (
    <figure className={`w-full max-w-[480px] ${className}`}>
      <div
        role="img"
        aria-label="Illustration of the Matches page: your artwork next to a copy found online, marked as a strong match, with a note that no watermark was found and the copy was matched by how it looks."
        className="glass relative overflow-hidden rounded-[24px] border border-[var(--border-glow)] p-4 shadow-floating sm:p-5"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--primary)] opacity-20 blur-3xl"
        />

        <div aria-hidden="true" className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="label-caps flex items-center gap-2 whitespace-nowrap text-[var(--text-muted)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              To review
            </span>
            <span className="whitespace-nowrap rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--success)]">
              Strong match · 94%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                <ArtworkSample id="hero-original" variant="original" className="aspect-[4/3] w-full" />
              </div>
              <p className="label-caps mt-2 text-[var(--text-muted)]">Yours</p>
            </div>
            <div>
              <div className="relative overflow-hidden rounded-xl border border-[var(--border-glow)]">
                <ArtworkSample id="hero-copy" variant="copy" className="aspect-[4/3] w-full scale-110" />
                <span className="tma-scan pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-transparent via-[rgb(0_210_255/0.35)] to-transparent" />
              </div>
              <p className="label-caps mt-2 text-[var(--primary)]">Found online</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5 text-[13px] leading-5">
            <li className="flex items-start gap-2.5">
              <Icon name="globe" className="mt-0.5 text-[18px] text-[var(--primary)]" />
              <span>
                <span className="text-[var(--text)]">Web page · item page</span>
                <span className="block font-mono text-[12px] text-[var(--text-muted)]">
                  shop.example.com/listing/4821
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Icon name="fingerprint" className="mt-0.5 text-[18px] text-[var(--primary)]" />
              <span className="text-[var(--text-muted)]">
                No watermark found, which is normal for a resized copy. Matched
                by how it looks.
              </span>
            </li>
          </ul>

          <div className="mt-4 flex gap-2">
            <span className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-[var(--primary-strong)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--on-primary)]">
              Yes, this is my work
            </span>
            <span className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-[var(--line-strong)] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text)]">
              Not a copy
            </span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[12px] text-[var(--text-muted)]">
        Illustration with generated artwork — not a real result.
      </figcaption>
    </figure>
  );
}
