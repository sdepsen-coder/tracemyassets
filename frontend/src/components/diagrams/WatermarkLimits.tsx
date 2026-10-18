import Link from "next/link";

import { Eyebrow } from "@/components/app/ui";

import { WatermarkSurvival } from "./WatermarkSurvival";

/**
 * Landing-page block: what the invisible mark can and cannot do. Leads with
 * the strength, then states the limit plainly. Facts come from
 * docs/test-results.md (Table 1).
 */
export function WatermarkLimits({ className = "" }: { className?: string }) {
  return (
    <div
      className={`glass grid gap-8 rounded-card border border-[var(--border)] p-6 sm:p-9 lg:grid-cols-[1fr_1.05fr] lg:items-center ${className}`}
    >
      <div>
        <Eyebrow>The invisible mark</Eyebrow>
        <h3 className="font-heading text-[28px] font-light leading-[1.12] tracking-[-0.02em] sm:text-[34px]">
          What the invisible mark can and cannot do
        </h3>
        <p className="mt-4 text-[16px] leading-7 text-[var(--text)]">
          The mark survives PNG, high-quality JPEG and WEBP, and contrast or
          colour changes.
        </p>
        <p className="mt-3 text-[16px] leading-7 text-[var(--text-muted)]">
          It is usually lost when an image is resized, cropped, rotated,
          mirrored, brightened, compressed harder or re-created with AI tools
          (we have not tested that last one). That is why we never rely on it
          alone: every copy we find is also compared with your original by how
          it looks.
        </p>
        <p className="mt-3 text-[13px] leading-5 text-[var(--text-muted)]">
          <Link href="/help" className="underline underline-offset-4">
            Every tested edit is listed on the Help page
          </Link>
          .
        </p>
      </div>
      <WatermarkSurvival compact />
    </div>
  );
}
