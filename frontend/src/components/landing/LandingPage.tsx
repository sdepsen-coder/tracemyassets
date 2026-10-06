import Link from "next/link";

import { PlanCards } from "@/components/pricing/PlanCards";
import { SiteFooter } from "@/components/SiteFooter";
import { Icon } from "@/components/dashboard/Icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SITE_NAME } from "@/lib/site";

import { ArtworkSample } from "./ArtworkSample";
import { AuthEntryButton } from "./AuthEntryButton";

const STEPS = [
  {
    icon: "upload",
    title: "Register your artwork",
    body: "Upload an original. It stays private, and you get back a protected copy with an invisible watermark to share instead.",
  },
  {
    icon: "travel_explore",
    title: "We keep watch",
    body: "Your artworks are checked against the sources we support, and possible copies are gathered for review.",
  },
  {
    icon: "fact_check",
    title: "Review the evidence",
    body: "Every candidate is compared with your original and your watermark. You see what we found and decide what to do next.",
  },
];

type Feature = {
  icon: string;
  title: string;
  body: string;
  soon?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: "water_drop",
    title: "Prove a copy came from you",
    body: "Share the protected version of your artwork. Nothing visible is added, but a copy that carries your invisible watermark can be traced back to your file.",
  },
  {
    icon: "visibility",
    title: "Keep watch automatically",
    body: "Set how often each artwork is checked and let the scans run while you get on with your work.",
  },
  {
    icon: "verified",
    title: "See real matches, not noise",
    body: "Search results are only leads. Each one is re-checked against your original before it is shown as a match, so you review fewer false alarms.",
  },
  {
    icon: "check_circle",
    title: "Check any image yourself",
    body: "Spotted something suspicious? Upload it and see how it compares with your registered artwork.",
  },
  {
    icon: "lock",
    title: "Your originals stay private",
    body: "Originals are never public. Matches and evidence are visible only to your account, and you can delete an artwork and its data whenever you like.",
  },
  {
    icon: "person_check",
    title: "You decide what happens next",
    body: "We never contact anyone or send notices for you. TraceMyAssets shows you what it found, and every next step is yours.",
  },
];

const COMING_SOON: Feature[] = [
  {
    icon: "notifications_active",
    title: "Email alerts",
    body: "Get told when a new possible match appears, so you do not have to keep checking.",
    soon: true,
  },
  {
    icon: "description",
    title: "Evidence pack",
    body: "A dated, downloadable record of a match: your original, the copy, and the comparison results.",
    soon: true,
  },
  {
    icon: "checklist",
    title: "Next steps and templates",
    body: "A guide to what you can do once you find a copy, with editable message templates you send yourself. Starting points, not legal advice.",
    soon: true,
  },
];

const SOURCES = [
  {
    name: "Web",
    status: "Live",
    live: true,
    body: "Visual search across the open web for pages that show images like yours.",
  },
  {
    name: "Amazon",
    status: "Coming to the beta",
    live: false,
    body: "Keyword-based discovery of product listings that may use your artwork.",
  },
  {
    name: "Etsy",
    status: "Coming to the beta",
    live: false,
    body: "Discovery of shop listings that may use your artwork, subject to Etsy's approval of our integration.",
  },
];

const LIMITS = [
  "Matches are technical signals, not legal proof of copying. They are a starting point for your own judgement.",
  "The invisible watermark is designed to survive everyday changes, but its robustness against heavy editing is still being tested.",
  "No match does not mean no copy. We can only look where our sources can see, and images not indexed anywhere are out of reach.",
];

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-heading text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[var(--text)] sm:text-[38px]">
        {title}
      </h2>
      {body && (
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--text-muted)]">
          {body}
        </p>
      )}
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <article
      className={`rounded-2xl border p-6 transition ${
        feature.soon
          ? "border-dashed border-[var(--border)] bg-[var(--surface-muted)]"
          : "border-[var(--border)] bg-[var(--surface)] shadow-card hover:-translate-y-0.5 hover:shadow-floating"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
          <Icon name={feature.icon} className="text-[22px]" />
        </span>
        {feature.soon && (
          <span className="rounded-full bg-[var(--warning-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning)]">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-4 font-heading text-[17px] font-semibold tracking-[-0.02em]">
        {feature.title}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
        {feature.body}
      </p>
    </article>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary-strong)_28%,transparent),transparent)] blur-2xl"
      />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-floating sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <Icon name="radar" className="text-[16px]" />
            </span>
            Scan result
          </div>
          <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--success)]">
            Verified match
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <figure>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--border)]">
              <ArtworkSample
                id="orig"
                variant="original"
                className="h-full w-full"
              />
            </div>
            <figcaption className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
              Your original
            </figcaption>
          </figure>

          <figure>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--border)]">
              <ArtworkSample
                id="copy"
                variant="copy"
                className="h-full w-full"
              />
              <div
                aria-hidden="true"
                className="tma-scan absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-white/45 to-transparent"
              />
            </div>
            <figcaption className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
              Found online
            </figcaption>
          </figure>
        </div>

        <ul className="mt-4 grid gap-2 text-[12px] sm:grid-cols-3">
          {[
            { icon: "fingerprint", label: "Visual match" },
            { icon: "water_drop", label: "Watermark found" },
            { icon: "verified", label: "Evidence saved" },
          ].map((chip) => (
            <li
              key={chip.label}
              className="flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2 font-medium text-[var(--text)]"
            >
              <span className="text-[var(--success)]">
                <Icon name={chip.icon} className="text-[16px]" />
              </span>
              {chip.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
        Illustration with generated artwork &mdash; not a real result.
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--background)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
              <Icon name="shield" />
            </span>
            <span className="font-heading text-[18px] font-semibold tracking-[-0.03em]">
              {SITE_NAME}
            </span>
          </Link>

          <nav
            aria-label="Page sections"
            className="hidden items-center gap-6 text-[13px] font-medium text-[var(--text-muted)] md:flex"
          >
            <a href="#features" className="transition hover:text-[var(--text)]">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-[var(--text)]">
              How it works
            </a>
            <a href="#sources" className="transition hover:text-[var(--text)]">
              Sources
            </a>
            <a href="#pricing" className="transition hover:text-[var(--text)]">
              Pricing
            </a>
            <a href="#limits" className="transition hover:text-[var(--text)]">
              Limits
            </a>
            <Link href="/help" className="transition hover:text-[var(--text)]">
              Help
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthEntryButton mode="login" variant="ghost">
              Sign in
            </AuthEntryButton>
            <span className="hidden sm:inline-flex">
              <AuthEntryButton mode="register">Get started</AuthEntryButton>
            </span>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(60%_50%_at_15%_0%,color-mix(in_srgb,var(--primary-strong)_14%,transparent),transparent),radial-gradient(45%_40%_at_95%_20%,color-mix(in_srgb,var(--success)_10%,transparent),transparent)]"
          />

          <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] shadow-card">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                Private beta &middot; free while we learn
              </p>

              <h1 className="mt-6 font-heading text-[42px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[58px]">
                Know where your{" "}
                <span className="bg-gradient-to-r from-[var(--primary-strong)] to-[var(--success)] bg-clip-text text-transparent">
                  art travels.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--text-muted)]">
                Protect your artwork with an invisible watermark and keep watch over where it appears online. Every possible match is verified against your original, so you get evidence to act on, not a pile of guesses.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <AuthEntryButton mode="register" size="lg">
                  Create free account
                  <Icon name="arrow_forward" />
                </AuthEntryButton>

                <a
                  href="#features"
                  className="inline-flex h-12 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 text-[15px] font-semibold text-[var(--text)] transition hover:bg-[var(--surface-muted)]"
                >
                  See what you get
                </a>
              </div>

              <p className="mt-5 text-[13px] text-[var(--text-muted)]">
                No credit card. Your originals stay private.
              </p>
            </div>

            <HeroMock />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="What you get"
              title="Protect your work and know where it stands"
              body="A focused set of tools to mark your artwork, watch for copies, and understand what you find."
            />

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </div>

            <div className="mt-16">
              <h3 className="text-center font-heading text-[20px] font-semibold tracking-[-0.02em]">
                On the way
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-center text-[14px] text-[var(--text-muted)]">
                What we are building next, shaped by what beta users tell us.
              </p>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {COMING_SOON.map((feature) => (
                  <FeatureCard key={feature.title} feature={feature} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--surface-muted)] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="How it works"
              title="From upload to evidence in three steps"
            />

            <ol className="mt-14 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Icon name={step.icon} className="text-[24px]" />
                    </span>
                    <span className="font-heading text-[40px] font-semibold leading-none tracking-[-0.05em] text-[var(--border)]">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-heading text-[19px] font-semibold tracking-[-0.02em]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-muted)]">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Sources */}
        <section
          id="sources"
          className="scroll-mt-20 py-20 sm:py-24"
        >
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="Where we look"
              title="Starting with the web, growing to marketplaces"
              body="Marketplace sources are being added during the beta, so we list exactly what works today."
            />

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {SOURCES.map((source) => (
                <article
                  key={source.name}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading text-[19px] font-semibold tracking-[-0.02em]">
                      {source.name}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        source.live
                          ? "bg-[var(--success-soft)] text-[var(--success)]"
                          : "bg-[var(--warning-soft)] text-[var(--warning)]"
                      }`}
                    >
                      {source.status}
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--text-muted)]">
                    {source.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="Plans"
              title="Start free. Upgrade when you need more."
              body="The Free plan needs no card. Paid plans are not open yet."
            />

            <div className="mt-12">
              <PlanCards compact />
            </div>

            <p className="mt-6 text-center text-[14px]">
              <Link
                href="/pricing"
                className="font-semibold text-[var(--primary)] underline"
              >
                See the full comparison
              </Link>
            </p>
          </div>
        </section>

        {/* Honest limits */}
        <section id="limits" className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--surface-muted)] py-20 sm:py-24">
          <div className="mx-auto max-w-[900px] px-4 sm:px-6">
            <SectionHeading
              eyebrow="Straight talk"
              title="What it can and can't tell you"
              body="We would rather you trust a modest tool than be misled by a bold one."
            />

            <ul className="mt-12 space-y-4">
              {LIMITS.map((limit) => (
                <li
                  key={limit}
                  className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]">
                    <Icon name="info" className="text-[18px]" />
                  </span>
                  <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
                    {limit}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final call to action */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-3xl bg-gradient-to-br from-[#2d3fe0] via-[#2331b8] to-[#101a6b] px-6 py-14 text-center text-white shadow-floating sm:px-12 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
            />
            <h2 className="relative font-heading text-[30px] font-semibold leading-tight tracking-[-0.035em] sm:text-[42px]">
              Start watching over your work
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/80">
              Join the private beta. It is free while we learn what artists
              actually need.
            </p>
            <div className="relative mt-8 flex justify-center">
              <AuthEntryButton mode="register" variant="onPrimary" size="lg">
                Create free account
                <Icon name="arrow_forward" />
              </AuthEntryButton>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
