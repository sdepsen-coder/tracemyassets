import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * General information, not legal advice. Written from a 2026 opt-out overview
 * by a law firm's blog (promise.legal), the EU text-and-data-mining rule and
 * each company's own practice of publishing crawler names. Figures from that
 * overview that had no source (download counts, flag counts) are NOT used.
 * Rules change quickly, so the guide says to check each company's current page
 * and states plainly that TraceMyAssets does not stop AI training.
 */
export function StopAiTrainingGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Many artists ask whether they can stop AI companies from using their
        work to train image generators. The honest answer is: partly, for the
        future, and mostly on a voluntary basis. This guide lists what can help,
        what each step cannot do, and where the rules are still unsettled.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. This area changes quickly: check
        each company&apos;s current page before you rely on a setting, and ask a
        professional about your own situation.
      </p>

      <LegalSection heading="Start with what an opt-out cannot do">
        <LegalList
          items={[
            "It does not remove your work from a model that has already been trained on it.",
            "Most opt-outs are promises by the company, not technical locks. Companies that ignore them are hard to stop.",
            "None of the steps below is a guarantee. Use several together and expect gaps.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="1. If you run your own website: say no in robots.txt">
        <p>
          A robots.txt file on your site tells crawlers which pages they may
          visit. Several AI companies publish the name of their crawler so you
          can block it. Examples include GPTBot (OpenAI), ClaudeBot (Anthropic),
          CCBot (Common Crawl), Google-Extended (Google) and Applebot-Extended
          (Apple). Crawler names change and new ones appear, so look up the
          current list on each company&apos;s own page and re-check every few
          months.
        </p>
        <p>
          Limits: it only works for images on a site you control, it only covers
          crawlers that obey it, and it does nothing about copies of your work on
          other people&apos;s sites.
        </p>
      </LegalSection>

      <LegalSection heading="2. Check the settings of the sites you post on">
        <p>
          Some portfolio and social sites offer a &ldquo;no AI&rdquo; tag or a
          setting about whether your images may be used for AI training, and some
          have an objection form that only applies in certain regions. Look in
          your account settings and the site&apos;s help pages. What exists, and
          what it is worth, differs from site to site and changes often.
        </p>
      </LegalSection>

      <LegalSection heading="3. Opt-out registries">
        <p>
          A few services let you flag your works so that companies that agreed to
          honour the list leave them out. They only work with companies that made
          that commitment, and they are not a legal right. Treat them as a
          helpful extra.
        </p>
      </LegalSection>

      <LegalSection heading="4. Tools that alter images to confuse training">
        <p>
          Some free tools change an image in ways that are hard to see, with the
          aim of disturbing a model that trains on it. Researchers have published
          methods that weaken some of these protections, and the tools in turn
          change in response. Think of them as one layer that may or may not hold
          up, not as a shield.
        </p>
      </LegalSection>

      <LegalSection heading="What about an invisible watermark?">
        <p>
          An invisible watermark does not stop an AI company from training on an
          image, and TraceMyAssets does not claim to. Our watermark and our scans
          are about something else: finding copies of your work online so you can
          decide what to do. In our own tests the mark was removed by resizing,
          cropping and stronger compression (see{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>
          ).
        </p>
      </LegalSection>

      <LegalSection heading="The law is still moving">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>EU:</strong> a rule on text and data
              mining lets rights holders reserve their rights, but only in a
              machine-readable way, such as in robots.txt or a similar file.
              Plain-text notices on a page are weaker.
            </>,
            <>
              <strong className={STRONG}>UK:</strong> the government consulted
              on an AI training exception with an opt-out. In its March 2026
              report it did not adopt that option and kept the status quo while
              it watches court cases. Check the current position.
            </>,
            <>
              <strong className={STRONG}>US:</strong> court cases about training
              on artists&apos; work are still in progress and there is no settled
              answer.
            </>,
          ]}
        />
        <p>
          If you think a company has used your work unlawfully, talk to a lawyer
          or an artists&apos; rights organisation in your country. Do not rely on
          a blog post, including this one.
        </p>
      </LegalSection>

      <LegalSection heading="A realistic checklist">
        <LegalList
          items={[
            "Block AI crawlers in robots.txt on any site you own, and review the list now and then.",
            "Check the AI settings on each site where you post work.",
            "Add your name and a copyright notice to your files and pages.",
            "Keep your working files and dates (see how to prove you made your artwork).",
            "Look for copies of your work, because that part you can act on.",
          ]}
        />
        <p>
          See{" "}
          <Link href="/guides/how-to-check-if-your-artwork-was-reposted" className={LINK}>
            how to check whether your artwork was reposted
          </Link>
          , and{" "}
          <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
            how to prove you made your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className={STRONG}>Can I make a company delete my work from a model?</strong>{" "}
          There is no general right or tool for that today. Opt-outs mostly
          affect future training.
        </p>
        <p>
          <strong className={STRONG}>Does TraceMyAssets prevent AI training?</strong>{" "}
          No. It helps you find possible copies of your registered artworks on
          public web pages.
        </p>
      </LegalSection>
    </>
  );
}
