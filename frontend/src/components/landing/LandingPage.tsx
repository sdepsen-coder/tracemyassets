import Link from "next/link";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/app/ui";
import { PlanCards } from "@/components/pricing/PlanCards";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LandingAccountMenu } from "@/components/dashboard/AccountMenu";
import { Icon } from "@/components/dashboard/Icon";

import { CannotSeeDiagram } from "@/components/diagrams/CannotSeeDiagram";
import { HowItWorksDiagram } from "@/components/diagrams/HowItWorksDiagram";
import { WatermarkLimits } from "@/components/diagrams/WatermarkLimits";

import { AuthEntryButton } from "./AuthEntryButton";
import { MatchPreview } from "./MatchPreview";
import { ProductDemo } from "./ProductDemo";
import {
  CompareVisual,
  EvidenceVisual,
  GalleryStrip,
  LensVisual,
  RadarVisual,
  ShopsVisual,
} from "./Visuals";

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
    icon: "add_photo_alternate",
    fact: ["Formats", "PNG, JPEG, WEBP · 25 MB"],
    title: "Upload and protect",
    body: "Upload your original. It stays private, and you get back a copy with an invisible watermark to share instead.",
  },
  {
    number: "02",
    icon: "autorenew",
    fact: ["Schedule", "Daily, weekly or monthly"],
    title: "We keep watching",
    body: "Choose how often your artwork is scanned automatically: daily on Extra, weekly or monthly on every plan. When a scheduled scan finds something new, we email you a count and a link.",
  },
  {
    number: "03",
    icon: "compare",
    fact: ["You see", "Both images, side by side"],
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

const H2 =
  "font-heading text-[30px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[42px]";

const CARD =
  "glass card-hover min-w-0 rounded-[20px] border border-[var(--border)] p-6 sm:p-7";

/** Plain facts about the product, shown under the hero buttons. */
const FACTS = [
  { value: "2", label: "search sources: Google web detection and Google Lens" },
  { value: "3", label: "artworks on the free plan, no card needed" },
  { value: "0", label: "messages sent on your behalf. You decide." },
];

function IconTile({ name }: { name: string }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-glow)] bg-[var(--primary-soft)] text-[var(--primary)]">
      <Icon name={name} className="text-[22px]" />
    </span>
  );
}

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
        "scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28",
        tinted ? "section-tint" : "",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-[760px] text-center">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className={H2}>{title}</h2>
          {body && (
            <p className="mx-auto mt-4 max-w-[620px] text-[17px] leading-7 text-[var(--text-muted)]">
              {body}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-screen text-[var(--text)]">
      <SiteHeader
        actions={
          <>
            {/* On phones "Sign in" lives in the menu so the bar stays short. */}
            <span className="hidden sm:block">
              <AuthEntryButton mode="login" variant="ghost" size="nav">
                Sign in
              </AuthEntryButton>
            </span>
            <AuthEntryButton mode="register" size="nav">
              Start free
            </AuthEntryButton>
            <LandingAccountMenu />
          </>
        }
        mobileSignIn={
          <AuthEntryButton mode="login" variant="ghost" size="menu">
            Sign in
          </AuthEntryButton>
        }
      />

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-20">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <span className="absolute -right-24 top-0 h-[460px] w-[460px] rounded-full bg-[#00d2ff] opacity-[0.14] blur-3xl" />
            <span className="absolute -left-32 top-72 h-[380px] w-[380px] rounded-full bg-[#00f5d4] opacity-[0.09] blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="min-w-0">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-glow)] bg-[var(--primary-soft)] px-3 py-1.5 font-mono text-[11.5px] font-medium text-[var(--primary)]">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                </span>
                Web watcher for your artwork
              </p>
              <h1 className="font-heading text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[58px] lg:text-[64px]">
                Someone is using your art.
                <span className="text-gradient block">Find out where.</span>
              </h1>
              <p className="mt-6 max-w-[540px] text-[17px] leading-7 text-[var(--text-muted)] sm:text-[18px] sm:leading-8">
                TraceMyAssets is a web watcher, like Google Alerts for images.
                Register your artwork and we keep scanning the public web for
                copies, compare every result with your original, and email you
                when a scheduled scan finds something new. When we find a
                copy, we show you both images side by side — you decide what
                to do.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <AuthEntryButton mode="register" size="lg">
                  <Icon name="shield" className="text-[20px]" />
                  Protect your first artwork — free
                </AuthEntryButton>
                <a
                  href="#product-demo"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-6 text-[15px] font-semibold transition hover:border-[var(--border-glow)] hover:text-[var(--primary)]"
                >
                  <Icon name="play_circle" className="text-[20px] text-[var(--primary)]" />
                  See how it works
                </a>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-6 sm:gap-6">
                {FACTS.map((fact, index) => (
                  <div key={fact.label}>
                    <dt className="sr-only">{fact.label}</dt>
                    <dd>
                      <span
                        className={`block font-mono text-[28px] font-semibold leading-none ${index === 0 ? "text-[var(--text)]" : index === 1 ? "text-[var(--primary)]" : "text-[var(--accent)]"}`}
                      >
                        {fact.value}
                      </span>
                      <span aria-hidden="true" className="mt-2 block text-[12px] leading-[1.45] text-[var(--text-muted)]">
                        {fact.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 max-w-[540px] text-[13px] leading-5 text-[var(--text-muted)]">
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
                and other digital creators. You also get a copy with an
                invisible watermark to share. We never publish your original
                or use your art to train models. To search, an image of your
                artwork goes to the search services named in our{" "}
                <Link href="/privacy" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="flex min-w-0 justify-center lg:justify-end">
              <MatchPreview />
            </div>
          </div>

          <div className="relative mx-auto mt-16 max-w-[1000px] sm:mt-24">
            <ProductDemo />
          </div>
        </section>

        {/* Where we look */}
        <Section
          id="sources"
          eyebrow="Where we look"
          title="Two ways to search the public web."
          body="Every result, from either scan, is compared with your original the same way before it counts as a match."
          tinted
        >
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {SOURCES.map((source, index) => (
              <div key={source.title} className={`${CARD} flex flex-col`}>
                <div className="flex items-center gap-3">
                  <IconTile name={source.icon} />
                  <h3 className="font-heading text-[19px] font-bold tracking-[-0.01em]">{source.title}</h3>
                </div>
                <p className="mt-4 flex-1 text-[15px] leading-6 text-[var(--text-muted)]">{source.body}</p>
                {index === 0 && <RadarVisual tag="Free · runs on your schedule" className="mt-6 h-[210px]" />}
                {index === 1 && <LensVisual tag="Google Lens · 1 credit" className="mt-6 h-[210px]" />}
                {index === 2 && <ShopsVisual className="mt-6 h-[210px]" />}
              </div>
            ))}
          </div>
        </Section>

        {/* What you get */}
        <Section
          eyebrow="What you get"
          title="Find copies before they spread."
          body="Copies of artwork can turn up on marketplaces and print shops. TraceMyAssets looks for them on the public web and shows you what it found, so you can check it and decide what to do."
        >
          <div className="mt-12 grid gap-5 lg:grid-cols-12">
            <div className={`${CARD} lg:col-span-7`}>
              <div className="flex items-center gap-3">
                <IconTile name="photo_library" />
                <span className="label-caps text-[var(--accent)]">Fewer false alarms</span>
              </div>
              <h3 className="mt-5 font-heading text-[24px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[28px]">
                Every result is checked against your original.
              </h3>
              <p className="mt-3 max-w-[520px] text-[15px] leading-6 text-[var(--text-muted)]">
                Search results are only leads. We compare each one with your
                original before we show it as a match, using the image itself
                and your invisible watermark.
              </p>
              <CompareVisual className="mt-6 min-h-[250px]" />
            </div>

            <div className={`${CARD} lg:col-span-5`}>
              <div className="flex items-center gap-3">
                <IconTile name="fingerprint" />
                <span className="label-caps text-[var(--accent)]">Evidence</span>
              </div>
              <h3 className="mt-5 font-heading text-[24px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[28px]">
                Evidence you can review.
              </h3>
              <p className="mt-3 text-[15px] leading-6 text-[var(--text-muted)]">
                See where it was found, how strong the match is, and whether
                your watermark is inside. On paid plans you also get
                ready-written messages to copy and send yourself.
              </p>
              <EvidenceVisual className="mt-6 min-h-[250px]" />
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <AuthEntryButton mode="register" size="lg">
              Start free
              <Icon name="arrow_forward" className="text-[20px]" />
            </AuthEntryButton>
          </div>
        </Section>

        {/* How it works */}
        <Section
          id="how-it-works"
          eyebrow="How it works"
          title="Three steps, then we keep watch."
          tinted
        >
          <ol className="relative mt-12 grid gap-5 md:grid-cols-3">
            <span
              aria-hidden
              className="absolute left-[16%] right-[16%] top-[50px] hidden h-px bg-gradient-to-r from-transparent via-[var(--border-glow)] to-transparent md:block"
            />
            {STEPS.map((step) => (
              <li key={step.number} className={`${CARD} relative flex flex-col`}>
                <IconTile name={step.icon} />
                <span className="mt-5 font-mono text-[12px] font-semibold tracking-[0.12em] text-[var(--primary)]">
                  STEP {step.number}
                </span>
                <h3 className="mt-1.5 font-heading text-[20px] font-bold tracking-[-0.01em]">{step.title}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-6 text-[var(--text-muted)]">{step.body}</p>
                <p className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-[11.5px]">
                  <span className="text-[var(--text-muted)]">{step.fact[0]}</span>
                  <span className="text-right font-medium text-[var(--accent)]">{step.fact[1]}</span>
                </p>
              </li>
            ))}
          </ol>
          <HowItWorksDiagram />
          <WatermarkLimits className="mt-6" />
        </Section>

        {/* Pricing */}
        <Section
          id="pricing"
          eyebrow="Pricing"
          title="Start free. Upgrade when you need more."
        >
          <div className="mt-12">
            <PlanCards compact />
          </div>
          <p className="mt-8 text-center text-[14px]">
            <Link href="/pricing" className="text-[var(--primary)] underline underline-offset-4">
              Compare all plans and credit packs
            </Link>
          </p>
        </Section>

        {/* What we cannot see */}
        <section className="section-tint px-4 py-20 sm:px-6">
          <div className="glass mx-auto max-w-[820px] rounded-[20px] border border-[var(--border)] p-7 sm:p-10">
            <Eyebrow>What we cannot see</Eyebrow>
            <CannotSeeDiagram className="mb-8 mt-2" />
            <p className="mt-2 text-[16px] leading-7 text-[var(--text-muted)]">
              A match is a possible match, never proof of copying or unlicensed
              use. You review it and decide, and we never contact anyone on
              your behalf.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <Section eyebrow="Questions" title="Frequently asked.">
          <div className="mx-auto mt-10 max-w-[820px] space-y-3">
            {FAQ.map((item) => (
              <details key={item.question} className="glass group rounded-2xl border border-[var(--border)] px-5 py-4 open:border-[var(--border-glow)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16.5px] font-semibold transition hover:text-[var(--primary)]">
                  {item.question}
                  <Icon
                    name="add"
                    className="text-[20px] text-[var(--primary)] transition group-open:rotate-45"
                  />
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-[var(--text-muted)]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-[14px] text-[var(--text-muted)]">
            More answers on the{" "}
            <Link href="/help" className="text-[var(--primary)] underline underline-offset-4">
              Help page
            </Link>
            .
          </p>
        </Section>

        {/* Final call to action */}
        <section className="px-4 pb-24 sm:px-6 sm:pb-32">
          <div className="glass relative mx-auto grid max-w-[1200px] items-center gap-10 overflow-hidden rounded-[28px] border border-[var(--border-glow)] p-8 shadow-[0_0_70px_-20px_rgb(0_210_255/0.45)] sm:p-14 lg:grid-cols-[1.1fr_1fr]">
            <span aria-hidden className="iris absolute inset-x-0 top-0 h-1" />
            <div>
              <h2 className={H2}>Your art deserves to be watched.</h2>
              <div className="mt-8">
                <AuthEntryButton mode="register" size="lg">
                  <Icon name="shield" className="text-[20px]" />
                  Protect your first artwork
                </AuthEntryButton>
              </div>
            </div>
            <GalleryStrip />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
