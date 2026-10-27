import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className={LINK} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Researched piece (checked 2026-10-27). Sources: the LightShed paper page
 * (USENIX Security 2025), the Fieldfisher summary of the UK government's March
 * 2026 report, the European Commission's consultation page on machine-readable
 * rights reservations, a Crowell note that the GPAI Code of Practice is
 * voluntary, and a case-tracking blog for the Andersen schedule. Facts that
 * rested on a single weak source (a "September 2026 jury trial" claim that
 * conflicts with the February 2026 schedule) are NOT used. Dates move, so the
 * text says "when this was written". No download counts or other unsourced
 * numbers. TraceMyAssets does not claim to stop AI training.
 */
export function AiTrainingEvidencePost() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        &ldquo;How do I stop AI from training on my art?&rdquo; gets a lot of
        confident answers online. Most of them are one tool or one setting
        presented as the solution. When you look at what each measure actually
        does, who has to cooperate for it to work, and what researchers and
        regulators have said, the picture is more modest and more useful: three
        different kinds of defence, each with a clear weak point.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice, checked on 27 October 2026. This
        area changes quickly, so check the sources at the end for newer
        developments. TraceMyAssets does not stop AI training; where we fit is
        described near the end.
      </p>

      <LegalSection heading="Three different goals">
        <p>
          &ldquo;Stopping training&rdquo; can mean three things, and a measure
          that helps with one usually does nothing for the others:
        </p>
        <LegalList
          items={[
            <>
              <strong className={STRONG}>Keep your work out</strong> of the data a
              company collects (opt-outs and crawler blocks).
            </>,
            <>
              <strong className={STRONG}>Make your work less useful</strong> if it
              is collected anyway (tools that alter the image).
            </>,
            <>
              <strong className={STRONG}>Make using it unlawful or costly</strong>{" "}
              (law, transparency and licensing).
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="1. Keeping your work out: it depends on who cooperates">
        <p>
          The main technical tool is robots.txt, plus newer machine-readable ways
          of saying &ldquo;do not use this for AI training&rdquo;. They work by
          asking. A crawler that respects the file stays out; a crawler that does
          not, gets in. That is why the policy side matters.
        </p>
        <p>
          In the EU, the General-Purpose AI Code of Practice includes a copyright
          chapter in which signatories commit to respect robots.txt and to
          identify and comply with appropriate machine-readable protocols for
          reserving rights. The European Commission ran a consultation (December
          2025 to January 2026) to help it publish a list of generally agreed
          machine-readable opt-out solutions, to be reviewed at least every two
          years.{" "}
          <Ext href="https://digital-strategy.ec.europa.eu/en/consultations/commission-launches-consultation-protocols-reserving-rights-text-and-data-mining-under-ai-act-and">
            Commission consultation page
          </Ext>
          .
        </p>
        <p>
          The weak point: the Code of Practice is something companies choose to
          sign, so it only binds the ones who do, and it governs future
          collection, not what a trained model already contains. And a crawler
          block on your own website does nothing about copies of your art posted
          on other people&apos;s sites, which is where much of it ends up.
        </p>
      </LegalSection>

      <LegalSection heading="2. Making your work less useful: a moving target">
        <p>
          Tools such as Glaze and Nightshade change an image in ways that are
          hard to see, aiming to disturb a model that trains on it. They are free,
          they were built for artists, and they attracted a lot of attention.
        </p>
        <p>
          Then researchers tested them. A paper at USENIX Security 2025, LightShed,
          presents a method that detects images protected by this kind of
          perturbation and removes the perturbation. For Nightshade the authors
          report a very high detection rate and say the method generalises across
          perturbation techniques; the abstract gives no Glaze-specific results.
          These are the authors&apos; own results.{" "}
          <Ext href="https://www.usenix.org/conference/usenixsecurity25/presentation/foerster">
            LightShed on USENIX
          </Ext>
          .
        </p>
        <p>
          The honest reading: this is an arms race. A protection that holds today
          may not hold against next year&apos;s methods, and the tools are updated
          in response. That does not make them worthless, it makes them a layer
          that you cannot rely on alone, and one that cannot be applied
          retroactively to images already collected.
        </p>
      </LegalSection>

      <LegalSection heading="3. Law, transparency and licensing: slow and uneven">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>UK:</strong> the government had floated an
              exception for AI training with an opt-out for rights holders. In its
              March 2026 report it did not adopt that option, citing practical and
              economic problems with opt-out systems, and kept the status quo while
              it watches court cases and international developments. It said it
              would not legislate on training-data transparency yet, and that a
              review would look at the tools creators can use to control their
              works online.{" "}
              <Ext href="https://www.fieldfisher.com/en/services/intellectual-property/intellectual-property-blog/uk-government-maintains-status-quo-on-ai-and-copyr">
                Fieldfisher summary
              </Ext>
              .
            </>,
            <>
              <strong className={STRONG}>EU:</strong> rights holders can reserve
              their rights against text and data mining, but only in an
              appropriate machine-readable way. What counts as appropriate is
              still being settled, as the Commission consultation shows.
            </>,
            <>
              <strong className={STRONG}>US:</strong> the artists&apos; case
              Andersen v. Stability AI was the first filed against AI image
              companies and has moved slowly. A case-tracking report from February
              2026 says the summary judgment hearing was moved from 4 November 2026
              to 17 February 2027, so a ruling was not due before then when this
              was written.{" "}
              <Ext href="https://chatgptiseatingtheworld.com/2026/02/03/sarah-andersens-copyright-lawsuit-the-1st-filed-v-ai-companies-gets-pushed-back-again-at-her-request/">
                Case tracking note
              </Ext>
              . Check the docket for later changes.
            </>,
          ]}
        />
        <p>
          The weak point is time. None of this changes anything for the work you
          post this week. It decides what is allowed in the future, and what
          happens to the data already collected is part of what the courts are
          still weighing.
        </p>
      </LegalSection>

      <LegalSection heading="Where watermarks and monitoring fit">
        <p>
          An invisible watermark does not stop training, and no honest vendor
          should say it does. In our own tests the mark was removed by resizing,
          cropping and stronger compression (see{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>
          ). What a mark, a dated record and monitoring can do is different:
          they help you find copies of your work on public pages and show that
          you published first. That helps you act on a copy, not on a training
          run. See{" "}
          <Link href="/blog/three-ways-to-find-copies-of-your-artwork" className={LINK}>
            three ways to find copies of your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What a sensible artist does with this">
        <LegalList
          items={[
            "Use the crawler blocks and site settings you control, and treat them as a request, not a lock.",
            "Treat image-altering tools as one layer that may weaken over time. Do not rely on them alone.",
            "Keep working files and first-publication dates. They help in any dispute, whatever the law turns out to be.",
            "Follow the places where rules change: the EU list of machine-readable opt-outs, the UK review of creators' tools, and the US court dockets.",
            "Look for copies of your work, because that is the part you can act on today.",
          ]}
        />
        <p>
          The short checklist is in{" "}
          <Link href="/guides/can-you-stop-ai-from-training-on-your-artwork" className={LINK}>
            Can you stop AI from training on your artwork?
          </Link>
        </p>
      </LegalSection>

      <LegalSection heading="What we did not check">
        <p>
          We did not test whether any particular company honours robots.txt, and
          we did not test Glaze or Nightshade ourselves. We report what the
          sources above say, and we flag that LightShed&apos;s numbers are the
          authors&apos; own. Court dates move, and reports about them can be wrong,
          so use the docket, not this post, for the current state of a case.
        </p>
      </LegalSection>

      <LegalSection heading="Sources">
        <LegalList
          items={[
            <Ext key="a" href="https://www.usenix.org/conference/usenixsecurity25/presentation/foerster">
              LightShed: Defeating Perturbation-based Image Copyright Protections (USENIX Security 2025)
            </Ext>,
            <Ext key="b" href="https://www.fieldfisher.com/en/services/intellectual-property/intellectual-property-blog/uk-government-maintains-status-quo-on-ai-and-copyr">
              Fieldfisher: UK government maintains status quo on AI and copyright (March 2026 report)
            </Ext>,
            <Ext key="c" href="https://digital-strategy.ec.europa.eu/en/consultations/commission-launches-consultation-protocols-reserving-rights-text-and-data-mining-under-ai-act-and">
              European Commission: consultation on protocols for reserving rights from text and data mining
            </Ext>,
            <Ext key="d" href="https://chatgptiseatingtheworld.com/2026/02/03/sarah-andersens-copyright-lawsuit-the-1st-filed-v-ai-companies-gets-pushed-back-again-at-her-request/">
              ChatGPT Is Eating the World: Andersen schedule pushed back
            </Ext>,
          ]}
        />
      </LegalSection>
    </>
  );
}
