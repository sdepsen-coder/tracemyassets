import Link from "next/link";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 shadow-card sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[var(--primary-soft)]/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-1/3 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl dark:bg-emerald-400/10" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--primary)] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
            Your workspace is ready
          </div>

          <h1 className="font-heading text-[30px] font-semibold tracking-[-0.035em] text-[var(--text)] sm:text-[40px] sm:leading-[1.15]">
            Protect and track your creative work.
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--text-muted)] sm:text-[17px]">
            Register your artwork, create a protected copy with an invisible
            watermark, and compare suspicious images against your saved work.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#asset-upload"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary-strong)] px-4 text-[13px] font-semibold text-white shadow-card transition hover:brightness-110"
          >
            <span className="material-symbols-outlined text-[18px]">
              add_photo_alternate
            </span>
            Upload artwork
          </a>

<Link
  href="/check"
  className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-semibold text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-raised)]"
>
  <span className="material-symbols-outlined text-[18px] text-[var(--primary)]">
    search
  </span>
  Check an image
</Link>
        </div>
      </div>

      <div className="relative z-10 mt-7 grid grid-cols-1 gap-3 border-t border-[var(--border)] pt-5 sm:grid-cols-3">
        <div className="rounded-lg bg-[var(--surface)]/80 p-4">
          <span className="font-mono text-[11px] text-[var(--primary)]">
            01
          </span>
          <h2 className="mt-2 text-[14px] font-semibold text-[var(--text)]">
            Upload artwork
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
            Add a PNG, JPEG, or WEBP image to your private account.
          </p>
        </div>

        <div className="rounded-lg bg-[var(--surface)]/80 p-4">
          <span className="font-mono text-[11px] text-[var(--primary)]">
            02
          </span>
          <h2 className="mt-2 text-[14px] font-semibold text-[var(--text)]">
            Download protected copy
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
            Your protected PNG includes an invisible, authenticated watermark.
          </p>
        </div>

        <div className="rounded-lg bg-[var(--surface)]/80 p-4">
          <span className="font-mono text-[11px] text-[var(--primary)]">
            03
          </span>
          <h2 className="mt-2 text-[14px] font-semibold text-[var(--text)]">
            Check possible copies
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">
            Compare a candidate image using watermark and visual signals.
          </p>
        </div>
      </div>
    </section>
  );
}