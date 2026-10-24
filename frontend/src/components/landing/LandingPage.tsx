import Link from "next/link";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/app/ui";
import { GlassArt } from "@/components/app/GlassArt";
import { Wordmark } from "@/components/app/brand";
import { PlanCards } from "@/components/pricing/PlanCards";
import { SiteFooter } from "@/components/SiteFooter";
import { LandingAccountMenu } from "@/components/dashboard/AccountMenu";
import { Icon } from "@/components/dashboard/Icon";

import { CannotSeeDiagram } from "@/components/diagrams/CannotSeeDiagram";
import { HowItWorksDiagram } from "@/components/diagrams/HowItWorksDiagram";
import { ScanComparison } from "@/components/diagrams/ScanComparison";
import { WatermarkLimits } from "@/components/diagrams/WatermarkLimits";

import { ArtworkSample } from "./ArtworkSample";
import { AuthEntryButton } from "./AuthEntryButton";

const SOURCES = [
  {
    icon: "travel_explore",
    title: "Standard scan",
    body: "Asks Google's web detection for public pages that show your image or a part of it. Free, and it also runs on your automatic schedule.",
  },
  {
    icon: "image_search",
    title: "Deep scan",
    body: "Asks Google Lens for exact matches of your image. It is a different source from the Standard scan, so each can list pages the other does not. Costs 1 credit.",
  },
  {
    icon: "storefront",
    title: "Shops and marketplaces",
    body: "A copy on a shop such as Etsy or Amazon can show up when a search engine has indexed its page. We do not connect to those shops directly.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Upload and protect",
    body: "Upload your original. It stays private, and you get back a copy with an invisible watermark to share instead.",
  },
  {
    number: "02",
    title: "We keep watching",
    body: "Choose how often your artwork is scanned automatically: daily on Pro and Extra, weekly or monthly on every plan. When a scheduled scan finds something new, we email you a count and a link.",
  },
  {
    number: "03",
    title: "Review the match",
    body: "See both images side by side, how strong the match is, where it was found (on paid plans), and whether your watermark is inside.",
  },
];

const FAQ = [
  {
    question: "How does the invisible watermark work without ruining my artwork?",
    answer:
      "It hides a small, signed code in the fine detail of the image. Nothing visible is added. If a copy of your protected file turns up unchanged or only lightly compressed, we can read the code back and link it to you. Edited copies are found by comparing how they look instead.",
  },
  {
    question: "What happens when you find a copy?",
    answer:
      "It appears in Matches. You compare it with your original and decide whether it is your work. If it is, you get step-by-step guidance and ready-written messages you can send yourself.",
  },
  {
    question: "Can someone remove the watermark by screenshotting or editing?",
    answer:
      "Yes. Many ordinary edits destroy it. In our tests the invisible mark survived saving as PNG, JPEG at quality 85 or higher, and some colour changes. Resizing, cropping, rotating, mirroring, a brightness change and stronger JPEG compression all destroyed it, so a screenshot or a shrunken copy will not carry it. That is why every result is also compared with your original by how it looks. In the same tests that comparison recognised copies that were resized to half, recompressed, cropped to 60 percent or hung in a framed mockup, but it can miss very small or heavily cropped ones. These were tests on generated images, not on real artwork.",
  },
  {
    question: "What do you search, and what can you not see?",
    answer:
      "Only public web pages that a search engine has indexed. Private groups, closed apps and some social networks are out of reach, and a copy on a page nobody has indexed cannot be found. No match does not prove that no copy exists.",
  },
  {
    question: "Do you send takedown notices for me?",
    answer:
      "No. We never contact anyone on your behalf. You decide what to do, and you send any message from your own account.",
  },
  {
    question: "What happens to my uploaded art?",
    answer:
      "Your original is never published. To search, an image of your artwork is sent to the search services we use, as our Privacy Policy explains. We do not sell your data or use your artwork to train models.",
  },
];

function Section({
  id,
  eyebrow,
  title,
  body,
  children,
  tinted,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  children?: ReactNode;
  tinted?: boolean;
}) {
  return (
    <section
      id={id}
      className={[
        "scroll-mt-28 px-4 py-24 sm:px-6 sm:py-32",
        tinted ? "bg-[var(--surface-muted)]" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="max-w-[720px]">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className="font-heading text-[36px] font-light leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
            {title}
          </h2>
          {body && (
            <p className="mt-5 text-[17px] leading-7 text-[var(--text-muted)]">{body}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function ProductPreview() {
  return (
    <div className="glass relative rounded-card border border-[var(--border)] p-4 shadow-[0_30px_80px_-30px_rgb(60_50_120/0.25)] sm:p-5">
      <div className="flex items-center justify-between">
        <span className="label-caps text-[var(--text-muted)]">Monitoring</span>
        <span className="iris rounded-full px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#111111]">
          2 copies
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <figure>
          <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--border)]">
            <ArtworkSample id="orig" variant="original" className="h-full w-full" />
          </div>
          <figcaption className="mt-2 text-[12px] text-[var(--text-muted)]">Your original</figcaption>
        </figure>
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[var(--border)]">
            <ArtworkSample id="copy" variant="copy" className="h-full w-full" />
            <div
              aria-hidden="true"
              className="tma-scan absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-white/50 to-transparent"
            />
          </div>
          <figcaption className="mt-2 text-[12px] text-[var(--text-muted)]">Found online</figcaption>
        </figure>
      </div>

      <ul className="mt-4 grid gap-2 text-[13px] sm:grid-cols-3">
        {["Strong visual match", "Watermark found", "Auto-scan weekly"].map((label) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3 py-2"
          >
            <Icon name="check" className="text-[16px] text-[var(--success)]" />
            {label}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
        Illustration with generated artwork — not a real result.
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text)]">
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="glass mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 shadow-[0_10px_40px_rgb(0_0_0/0.05)] sm:px-5">
          <Wordmark />

          <nav
            aria-label="Page sections"
            className="hidden items-center gap-7 text-[14px] text-[var(--text-muted)] lg:flex"
          >
            <a href="#how-it-works" className="transition hover:text-[var(--text)]">
              How it works
            </a>
            <a href="#sources" className="transition hover:text-[var(--text)]">
              Where we look
            </a>
            <a href="#pricing" className="transition hover:text-[var(--text)]">
              Pricing
            </a>
            <Link href="/help" className="transition hover:text-[var(--text)]">
              Help
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <AuthEntryButton mode="login" variant="ghost">
              Sign in
            </AuthEntryButton>
            <span className="hidden sm:inline-flex">
              <AuthEntryButton mode="register">Start free</AuthEntryButton>
            </span>
            <LandingAccountMenu />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <span className="absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-[#c9c3f5] opacity-40 blur-3xl" />
            <span className="absolute right-40 top-64 h-[320px] w-[320px] rounded-full bg-[#bfd9f7] opacity-50 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <h1 className="font-heading text-[52px] font-light leading-[0.98] tracking-[-0.04em] sm:text-[80px] lg:text-[96px]">
                Someone is using your art.
                <span className="block text-[var(--text-muted)]">Find out where.</span>
              </h1>
              <p className="mt-8 max-w-[560px] text-[18px] leading-8 text-[var(--text-muted)]">
                TraceMyAssets is a web watcher, like Google Alerts for images.
                Add an invisible watermark to your artwork and we keep
                scanning the public web for copies and email you when a scheduled scan finds something new. When we find a copy, we show
                you both images side by side — you decide what to do.
              </p>
              <p className="mt-4 max-w-[560px] text-[14px] leading-6 text-[var(--text-muted)]">
                For{" "}
                <Link href="/for/illustrators" className="text-[var(--text)] underline underline-offset-4">
                  illustrators
                </Link>
                ,{" "}
                <Link href="/for/photographers" className="text-[var(--text)] underline underline-offset-4">
                  photographers
                </Link>
                , designers,{" "}
                <Link href="/for/etsy-sellers" className="text-[var(--text)] underline underline-offset-4">
                  Etsy sellers
                </Link>{" "}
                and other digital creators.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <AuthEntryButton mode="register" size="lg">
                  Protect your first artwork — free
                </AuthEntryButton>
                <a
                  href="#how-it-works"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line-strong)] px-7 text-[12px] font-medium uppercase tracking-[0.08em] transition hover:bg-[var(--surface-muted)]"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-4 text-[13px] text-[var(--text-muted)]">No credit card needed.</p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <GlassArt motif="shield" size="lg" />
            </div>
          </div>

          <div className="relative mx-auto mt-20 max-w-[760px]">
            <ProductPreview />
          </div>
        </section>

        {/* Where we look */}
        <Section
          id="sources"
          eyebrow="Where we look"
          title="Two ways to search the public web."
          body="Both look only at pages that search engines have indexed. Every result, from either scan, is compared with your original the same way before it counts as a match."
          tinted
        >
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {SOURCES.map((source) => (
              <div key={source.title} className="glass rounded-card border border-[var(--border)] p-6">
                <span className="iris flex h-11 w-11 items-center justify-center rounded-xl text-[#111111]">
                  <Icon name={source.icon} className="text-[22px]" />
                </span>
                <h3 className="mt-6 text-[18px] font-medium">{source.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-[var(--text-muted)]">{source.body}</p>
              </div>
            ))}
          </div>
          <ScanComparison className="mt-6 max-w-[720px]" />
        </Section>

        {/* Feature band */}
        <section className="px-4 py-24 sm:px-6 sm:py-32">
          <div className="glass mx-auto grid max-w-[1200px] items-center gap-10 overflow-hidden rounded-[28px] border border-[var(--border)] p-8 sm:p-14 lg:grid-cols-2">
            <div className="flex justify-center">
              <GlassArt motif="lens" size="lg" />
            </div>
            <div>
              <h2 className="font-heading text-[36px] font-light leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
                Find copies before they spread.
              </h2>
              <p className="mt-5 text-[17px] leading-7 text-[var(--text-muted)]">
                Copies of artwork can turn up on marketplaces and print shops.
                TraceMyAssets looks for them on the public web and shows you
                what it found, so you can check it and decide what to do.
              </p>
              <div className="mt-8">
                <AuthEntryButton mode="register" size="lg">
                  Start free
                </AuthEntryButton>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <Section
          id="how-it-works"
          eyebrow="How it works"
          title="Three steps, then we keep watch."
          tinted
        >
          <ol className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.number} className="glass rounded-card border border-[var(--border)] p-7">
                <span className="font-heading text-[56px] font-light leading-none text-[var(--text-muted)]">
                  {step.number}
                </span>
                <h3 className="mt-8 text-[20px] font-medium">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-[var(--text-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
          <HowItWorksDiagram />
          <WatermarkLimits className="mt-6" />
        </Section>

        {/* Two feature rows */}
        <section className="px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto grid max-w-[1200px] gap-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Eyebrow>Fewer false alarms</Eyebrow>
                <h2 className="font-heading text-[36px] font-light leading-[1.08] tracking-[-0.03em] sm:text-[48px]">
                  Every result is checked against your original.
                </h2>
                <p className="mt-5 text-[17px] leading-7 text-[var(--text-muted)]">
                  Search results are only leads. We compare each one with your
                  original before we show it as a match, using the image
                  itself and your invisible watermark.
                </p>
              </div>
              <div className="flex justify-center">
                <GlassArt motif="frames" size="lg" />
              </div>
            </div>

            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="order-2 flex justify-center lg:order-1">
                <GlassArt motif="fingerprint" size="lg" />
              </div>
              <div className="order-1 lg:order-2">
                <Eyebrow>Evidence</Eyebrow>
                <h2 className="font-heading text-[36px] font-light leading-[1.08] tracking-[-0.03em] sm:text-[48px]">
                  Evidence you can review.
                </h2>
                <p className="mt-5 text-[17px] leading-7 text-[var(--text-muted)]">
                  See where it was found, how strong the match is, and whether
                  your watermark is inside. On paid plans you also get
                  ready-written messages to copy and send yourself.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <Section
          id="pricing"
          eyebrow="Pricing"
          title="Start free. Upgrade when you need more."
          tinted
        >
          <div className="mt-14">
            <PlanCards compact />
          </div>
          <p className="mt-8 text-center text-[14px]">
            <Link href="/pricing" className="underline underline-offset-4">
              Compare all plans
            </Link>
          </p>
        </Section>

        {/* What we cannot see */}
        <section className="px-4 py-20 sm:px-6">
          <div className="glass mx-auto max-w-[820px] rounded-card border border-[var(--border)] p-7 sm:p-10">
            <Eyebrow>What we cannot see</Eyebrow>
            <CannotSeeDiagram className="mb-8 mt-2" />
            <ul className="mt-2 space-y-3 text-[16px] leading-7 text-[var(--text-muted)]">
              <li>
                We look only at public web pages that a search engine has
                indexed.
              </li>
              <li>
                Private groups, closed apps and some social networks are out of
                reach.
              </li>
              <li>
                A match is a possible match, never proof of copying or
                unlicensed use. You review it and decide.
              </li>
              <li>We never contact anyone for you.</li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <Section eyebrow="Questions" title="Frequently asked." tinted>
          <div className="mt-12 max-w-[820px] divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px]">
                  {item.question}
                  <Icon
                    name="add"
                    className="text-[20px] text-[var(--text-muted)] transition group-open:rotate-45"
                  />
                </summary>
                <p className="mt-3 max-w-[680px] text-[15px] leading-7 text-[var(--text-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-[14px] text-[var(--text-muted)]">
            More answers on the{" "}
            <Link href="/help" className="underline underline-offset-4">
              Help page
            </Link>
            .
          </p>
        </Section>

        {/* Final call to action */}
        <section className="px-4 py-24 sm:px-6 sm:py-32">
          <div className="glass relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] border border-[var(--border)] px-8 py-16 text-center sm:py-20">
            <span aria-hidden className="iris absolute inset-x-0 top-0 h-1" />
            <div className="flex justify-center">
              <GlassArt motif="shield" size="sm" />
            </div>
            <h2 className="mt-6 font-heading text-[36px] font-light leading-[1.08] tracking-[-0.03em] sm:text-[52px]">
              Your art deserves to be watched.
            </h2>
            <div className="mt-8 flex justify-center">
              <AuthEntryButton mode="register" size="lg">
                Protect your first artwork
              </AuthEntryButton>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
