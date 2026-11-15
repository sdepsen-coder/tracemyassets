import Image from "next/image";

import { Icon } from "@/components/dashboard/Icon";

import { ArtworkSample } from "./ArtworkSample";
import landingBanner from "./landing-banner.jpg";
import { Tag } from "./Visuals";

/**
 * Hero picture: a large framed scene with what a match looks like in the app
 * (the same words as the real Matches page) over the banner image. It is drawn
 * with generated artwork and says so underneath: an illustration, not a real
 * result.
 */
export function MatchPreview({ className = "" }: { className?: string }) {
  return (
    <figure className={`w-full min-w-0 max-w-[560px] ${className}`}>
      <div
        role="img"
        aria-label="Illustration of the Matches page: your artwork next to a copy found online, marked as a strong match, with a note that no watermark was found and the copy was matched by how it looks."
        className="relative overflow-hidden rounded-[22px] border border-[var(--border-glow)] p-1.5 shadow-[0_0_60px_-12px_rgb(0_210_255/0.45)]"
      >
        <div aria-hidden="true" className="relative overflow-hidden rounded-[17px] bg-[#070b14] p-4 sm:p-6">
          <Image
            src={landingBanner}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            placeholder="blur"
            className="object-cover object-[70%_50%] opacity-95"
          />
          <span className="absolute inset-0 bg-gradient-to-b from-[rgb(7_11_20/0.05)] via-[rgb(7_11_20/0.35)] to-[rgb(7_11_20/0.9)]" />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Tag tone="info">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                Scheduled scan · new match
              </Tag>
              <Tag tone="success" icon="check">Strong match · 94%</Tag>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-16 sm:gap-4">
              <div>
                <div className="overflow-hidden rounded-xl border border-white/20 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)]">
                  <ArtworkSample id="hero-original" art="hills" className="aspect-[4/3] w-full" />
                </div>
                <p className="label-caps mt-2 text-white/70">Yours</p>
              </div>
              <div>
                <div className="relative overflow-hidden rounded-xl border border-[var(--border-glow)] shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)]">
                  <ArtworkSample id="hero-copy" art="hills" variant="copy" className="aspect-[4/3] w-full scale-[1.18]" />
                  <span className="scan-beam pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[rgb(0_210_255/0.4)] to-transparent" />
                </div>
                <p className="label-caps mt-2 text-[#00d2ff]">Found online</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[rgb(10_14_23/0.78)] p-3 backdrop-blur">
              <div className="flex items-center gap-2.5 text-[13px] text-white">
                <Icon name="globe" className="text-[17px] text-[#00d2ff]" />
                <span className="whitespace-nowrap">Web page · item page</span>
                <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-white/60">
                  shop.example.com/listing/4821
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2.5 text-[12.5px] leading-5 text-white/70">
                <Icon name="fingerprint" className="mt-0.5 text-[17px] text-[#00f5d4]" />
                No watermark found, which is normal for a resized copy. Matched
                by how it looks.
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[12px] text-[var(--text-muted)]">
        Illustration with generated artwork — not a real result.
      </figcaption>
    </figure>
  );
}
