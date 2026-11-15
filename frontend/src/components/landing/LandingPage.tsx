import Link from "next/link";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/app/ui";
import { GlassArt } from "@/components/app/GlassArt";
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
    body: "Choose how often your artwork is scanned automatically: daily on Extra, weekly or monthly on every plan. When a scheduled scan finds something new, we email you a count and a link.",
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

const H2 =
  "font-heading text-[32px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[44px]";

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
        <div className="max-w-[720px]">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 className={H2}>{title}</h2>
          {body && (
            <p className="mt-5 text-[17px] leading-7 text-[var(--text-muted)]">{body}</p>
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
            <span className="absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-[#00d2ff] opacity-[0.12] blur-3xl" />
            <span className="absolute -left-32 top-72 h-[360px] w-[360px] rounded-full bg-[#00f5d4] opacity-[0.08] blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="label-caps mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-glow)] bg-[var(--primary-soft)] px-3 py-1.5 text-[var(--primary)]">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--primary)]" />
                </span>
                Web watcher for your artwork
              </p>
              <h1 className="font-heading text-[40px] font-extrabold leading-[1.06] tracking-[-0.025em] sm:text-[60px] lg:text-[68px]">
                Someone is using your art.
                <span className="text-gradient block">Find out where.</span>
              </h1>
              <p className="mt-6 max-w-[560px] text-[17px] leading-7 text-[var(--text-muted)] sm:text-[18px] sm:leading-8">
                TraceMyAssets is a web watcher, like Google Alerts for images.
                Register your artwork and we keep scanning the public web for
                copies, compare every result with your original, and email you
                when a scheduled scan finds something new. When we find a
                copy, we show you both images side by side — you decide what
                to do.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <AuthEntryButton mode="register" size="lg">
                  Protect your first artwork — free
                </AuthEntryButton>
                <a
                  href="#product-demo"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--line-strong)] px-7 text-[12px] font-medium uppercase tracking-[0.08em] transition hover:border-[var(--border-glow)] hover:text-[var(--primary)]"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-5 max-w-[560px] text-[14px] leading-6 text-[var(--text-muted)]">
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
              <p className="mt-3 max-w-[480px] text-[13px] leading-5 text-[var(--text-muted)]">
                No credit card needed. You also get a copy with an invisible
                watermark to share. We never publish your original or use
                your art to train models. To search, an image of your artwork
                goes to the search services named in our{" "}
                <Link href="/privacy" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <MatchPreview />
            </div>
          </div>

          <div className="relative mx-auto mt-16 max-w-[1000px] sm:mt-20">
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
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {SOURCES.map((source) => (
              <div key={source.title} className="glass card-hover rounded-card border border-[var(--border)] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-glow)] bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Icon name={source.icon} className="text-[22px]" />
                </span>
                <h3 className="mt-6 font-heading text-[18px] font-semibold">{source.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-[var(--text-muted)]">{source.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Feature band */}
        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="glass mx-auto grid max-w-[1200px] items-center gap-10 overflow-hidden rounded-[28px] border border-[var(--border)] p-8 sm:p-14 lg:grid-cols-2">
            <div className="flex justify-center">
              <GlassArt motif="lens" size="lg" />
            </div>
            <div>
              <h2 className={H2}>Find copies before they spread.</h2>
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
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.number} className="glass card-hover rounded-card border border-[var(--border)] p-7">
                <span className="font-mono text-[13px] font-medium tracking-[0.1em] text-[var(--primary)]">
                  STEP {step.number}
                </span>
                <h3 className="mt-5 font-heading text-[20px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-[var(--text-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
          <HowItWorksDiagram />
          <WatermarkLimits className="mt-6" />
        </Section>

        {/* Two feature rows */}
        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto grid max-w-[1200px] gap-20">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Eyebrow>Fewer false alarms</Eyebrow>
                <h2 className={H2}>Every result is checked against your original.</h2>
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
                <h2 className={H2}>Evidence you can review.</h2>
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
        <section className="px-4 py-20 sm:px-6">
          <div className="glass mx-auto max-w-[820px] rounded-card border border-[var(--border)] p-7 sm:p-10">
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
        <Section eyebrow="Questions" title="Frequently asked." tinted>
          <div className="mt-10 max-w-[820px] divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {FAQ.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium transition hover:text-[var(--primary)]">
                  {item.question}
                  <Icon
                    name="add"
                    className="text-[20px] text-[var(--primary)] transition group-open:rotate-45"
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
            <Link href="/help" className="text-[var(--primary)] underline underline-offset-4">
              Help page
            </Link>
            .
          </p>
        </Section>

        {/* Final call to action */}
        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="glass relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] border border-[var(--border-glow)] px-8 py-16 text-center sm:py-20">
            <span aria-hidden className="iris absolute inset-x-0 top-0 h-1" />
            <div className="flex justify-center">
              <GlassArt motif="shield" size="sm" />
            </div>
            <h2 className={`mt-6 ${H2}`}>Your art deserves to be watched.</h2>
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
