"use client";

import { useRef, useState } from "react";
import { AuthEntryButton } from "./AuthEntryButton";

export function ProductDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const youtubeUrl = process.env.NEXT_PUBLIC_DEMO_YOUTUBE_URL;

  async function play() {
    if (!video.current) return;
    try {
      await video.current.play();
      setStarted(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <section id="product-demo" aria-labelledby="product-demo-heading" className="scroll-mt-28">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">See invisible watermarking in action</p>
          <h2 id="product-demo-heading" className="font-heading text-[30px] font-light leading-tight tracking-[-0.03em] sm:text-[40px]"><span className="text-[#7761bb]">Invisible watermark.</span> Nothing covers your art.</h2>
        </div>
        <span className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-muted)]">45 seconds · No sound needed</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#f7f6f3] shadow-[0_24px_70px_-30px_rgb(60_50_120/0.25)]">
        <video
          ref={video}
          controls={started}
          playsInline
          preload="none"
          poster="/media/product-demo-poster-45s.jpg"
          aria-label="45-second TraceMyAssets walkthrough: upload, watermark, monitoring, scan and match review"
          aria-describedby="product-demo-description"
          className="aspect-video w-full"
        >
          <source src="/media/product-demo-45s.mp4" type="video/mp4" />
          <a href="/media/product-demo-45s.mp4">Download the product demo</a>
        </video>
        {!started && (
          <button type="button" onClick={play} aria-label="Play the 45-second product demo" className="group absolute inset-0 flex items-center justify-center bg-black/5 transition hover:bg-black/10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#7761bb]">
            <span className="flex items-center gap-3 rounded-full border border-white/40 bg-[#222127]/90 px-6 py-4 text-sm font-medium text-white shadow-xl backdrop-blur-sm transition group-hover:scale-105">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M8 5v14l11-7z" /></svg>
              Watch the demo <span className="text-white/60">0:45</span>
            </span>
          </button>
        )}
      </div>
      {failed && <p role="alert" className="mt-3 text-sm">The video could not start. <a href="/media/product-demo-45s.mp4" className="underline">Open the video directly</a>.</p>}
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p id="product-demo-description" className="max-w-[620px] text-[13px] leading-6 text-[var(--text-muted)]">Recorded on TraceMyAssets using a sample image. Review possible matches, check the source, and choose your next step.</p>
          {youtubeUrl && <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-[13px] underline underline-offset-4">Watch the full walkthrough on YouTube <span aria-hidden="true">↗</span></a>}
        </div>
        <span className="shrink-0"><AuthEntryButton mode="register">Try it free</AuthEntryButton></span>
      </div>
    </section>
  );
}
