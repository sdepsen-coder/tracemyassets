import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * General information, not legal advice. Read from Temu's intellectual
 * property policy on 2026-10-27: the IP Portal (login needed), what a report
 * should contain, the DMCA agent route, counter-notices and the repeat
 * infringer line. The page states no timelines and no counter-notice waiting
 * period, so none are given.
 */
export function TemuGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You found your artwork on a product page on Temu. Temu has an online
        portal for intellectual property reports. This guide covers what it asks
        for, what it says it will do, and what is not stated, so you know what
        not to expect.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. This follows Temu&apos;s published
        policy as read on 27 October 2026. Policies change, so open Temu&apos;s
        current page before you file. Temu is a trademark of its owner;
        TraceMyAssets is not affiliated with it.
      </p>

      <LegalSection heading="Who can report">
        <p>
          Only the rights owner, or an agent with the owner&apos;s permission. Temu
          says any report must be made in good faith and sworn under penalty of
          perjury.
        </p>
      </LegalSection>

      <LegalSection heading="Where to report">
        <LegalList
          items={[
            "The IP Portal on Temu's site. You have to be logged in to use it.",
            "For copyright (DMCA) notices, Temu encourages the portal. If you cannot use it, send the same information to Temu's DMCA Designated Agent, whose details are linked from the policy.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What a report should contain">
        <LegalList
          items={[
            "Identification of your work: a registration number if you have one, a description, a link and the date of first publication or use.",
            "The nature of the problem: the product, its packaging, or the images or text on the product page.",
            "The URLs of the product pages, and the names of the parties responsible.",
            "Supporting documents, for example order IDs from a test purchase.",
            "Your contact details and anything else the law requires.",
          ]}
        />
        <p>
          Temu may ask for more, such as proof of your right and ownership, before
          it processes the report. For a DMCA notice, the contents are the same as
          in the{" "}
          <Link href="/guides/dmca-takedown-notice-template-for-artists" className={LINK}>
            DMCA notice template
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What Temu says happens next">
        <p>
          If the report is accepted, Temu says it will remove the content and take
          appropriate action against the responsible parties. It does not share
          non-public details of the action. You can withdraw a report through the
          portal.
        </p>
        <p>
          Temu may reject reports it considers false, fraudulent, incomplete or
          made in bad faith, and it may restrict the submission privileges of
          someone who keeps filing inaccurate reports. It says it terminates repeat
          infringers in appropriate circumstances, without defining them.
        </p>
      </LegalSection>

      <LegalSection heading="What the page does not say">
        <LegalList
          items={[
            "How long a report takes to process.",
            "How long an investigation takes.",
            "A waiting or restoration period after a counter-notice.",
            "What counts as a repeat infringer.",
          ]}
        />
        <p>
          So do not plan around a timeline. Keep your evidence organised and
          re-check after a week, since the same design can reappear on new
          listings.
        </p>
      </LegalSection>

      <LegalSection heading="If the seller sends a counter-notice">
        <p>
          A seller can respond with a signed counter-notice that identifies the
          removed material and where it was, contains a sworn good-faith statement
          that the removal was a mistake or misidentification, gives contact
          details, and consents to a US federal court&apos;s jurisdiction and to
          accept service of process. Temu says it will act in line with the DMCA
          when it receives one. Read{" "}
          <Link href="/guides/what-to-do-if-a-seller-files-a-counter-notice" className={LINK}>
            what to do if a seller files a counter-notice
          </Link>{" "}
          before you decide your next step.
        </p>
      </LegalSection>

      <LegalSection heading="Be careful before you send">
        <p>
          Only report what you are sure is yours and was not authorised. A
          knowing false claim can create liability under 17 U.S.C. 512(f), and
          Temu warns about this in its own policy.
        </p>
      </LegalSection>

      <LegalSection heading="Finding copies on Temu sooner">
        <p>
          Searching Temu by hand does not scale. TraceMyAssets checks the artworks
          you register on a schedule and shows possible matches for you to review.
          We only see public pages that a search engine indexes, so some listings
          will be missed, and a match is a possible match, never proof. You decide
          what to do and you send every report yourself. See{" "}
          <Link href="/guides/found-your-artwork-on-temu-redbubble-or-amazon" className={LINK}>
            the other platforms
          </Link>{" "}
          or the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className={STRONG}>Do I need to be logged in?</strong> Yes, for
          the IP Portal. If you cannot use it, Temu points DMCA notices to its
          designated agent.
        </p>
        <p>
          <strong className={STRONG}>How long does Temu take?</strong> The policy
          page gives no timelines.
        </p>
      </LegalSection>
    </>
  );
}
