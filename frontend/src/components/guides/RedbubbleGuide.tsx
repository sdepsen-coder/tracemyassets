import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * General information, not legal advice. Read from Redbubble's IP policy page
 * on 2026-10-27: the report form, the dmca@ address for other complaints, the
 * six notice elements, what Redbubble says it does, and its counter-notice
 * steps (including the 14 days). The page states no processing times, so none
 * are promised. The guide tells the reader to open the current form.
 */
export function RedbubbleGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You found your artwork on a sticker, phone case or poster in someone
        else&apos;s Redbubble shop. Redbubble has a set route for copyright
        reports. This guide covers what it asks for, what it says happens next,
        and what to expect if the seller answers.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. This follows Redbubble&apos;s
        published policy as read on 27 October 2026. Policies change, so open
        Redbubble&apos;s current page before you file. Redbubble is a trademark of
        its owner; TraceMyAssets is not affiliated with it.
      </p>

      <LegalSection heading="Before you file: collect your evidence">
        <LegalList
          items={[
            "The URL of each product page that uses your work, in the format Redbubble asks for.",
            "Screenshots of the product page, showing the date and the seller name.",
            "Your original file and working files, with dates.",
            "A link to where you first published the work.",
          ]}
        />
        <p>
          See{" "}
          <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
            how to prove you made your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Where to report">
        <LegalList
          items={[
            "Redbubble's Notice and Takedown Report form, linked from its IP policy page. This is the route for copyright notices.",
            "For other intellectual property complaints, the policy page gives an email address (dmca@redbubble.com at the time of writing).",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What the notice must contain">
        <p>
          Redbubble asks for the same elements as US law (see the{" "}
          <Link href="/guides/dmca-takedown-notice-template-for-artists" className={LINK}>
            DMCA notice template
          </Link>
          ):
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>A signature from the person authorised to act for the owner.</li>
          <li>A description of the work you say is infringed.</li>
          <li>The location of the material on Redbubble, as a URL.</li>
          <li>Your address, phone number and email address.</li>
          <li>
            A statement of good-faith belief that the use is not authorised by the
            owner, its agent or the law.
          </li>
          <li>
            A statement, under penalty of perjury, that the information is
            accurate and that you are authorised to act for the owner.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="What Redbubble says happens next">
        <p>
          Redbubble says it has a legal obligation to act on reports made under
          its policy, and that a removal does not mean it has found infringement.
          The reported works are removed and the artist can no longer see or
          update them. It also says accounts can face action under its repeat
          infringer policy, up to disabling the account.
        </p>
        <p>
          The policy page does not state how long processing takes, so do not
          count on a timeline. Keep your evidence organised and re-check the shop
          after a week, since copies often come back under new listings.
        </p>
      </LegalSection>

      <LegalSection heading="If the seller files a counter-notice">
        <p>
          Redbubble has a Counter Notice form. A counter-notice needs a signature,
          the description and URL of the removed content, contact details, consent
          to the jurisdiction of a US federal court in San Francisco County,
          California, with acceptance of service of process, and a statement under
          penalty of perjury that the removal was a mistake or misidentification.
        </p>
        <p>
          Redbubble says that in many cases it forwards the counter-notice to you,
          including the seller&apos;s contact details, and that you may then take
          legal action. If 14 days pass with no legal action, the seller can ask
          Redbubble to reinstate the work, which it may do if the work otherwise
          follows its policies. If you are unsure what to do at that point, read{" "}
          <Link href="/guides/what-to-do-if-a-seller-files-a-counter-notice" className={LINK}>
            what to do if a seller files a counter-notice
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Be careful before you send">
        <p>
          Only report what you are sure is yours and was not authorised. A seller
          may hold a licence, or a design may be similar but independent. A
          knowing false claim can create liability under 17 U.S.C. 512(f).
        </p>
      </LegalSection>

      <LegalSection heading="Finding copies on Redbubble sooner">
        <p>
          Searching Redbubble by hand does not scale. TraceMyAssets checks the
          artworks you register on a schedule and shows possible matches for you to
          review. We only see public pages that a search engine indexes, so some
          listings will be missed, and a match is a possible match, never proof.
          You decide what to do and you send every notice yourself. See{" "}
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
          <strong className={STRONG}>Who can report my work on Redbubble?</strong>{" "}
          The owner, or a person authorised to act for the owner. Redbubble asks
          you to state that you are authorised.
        </p>
        <p>
          <strong className={STRONG}>How long does removal take?</strong>{" "}
          Redbubble&apos;s policy page does not say. Expect it to vary.
        </p>
      </LegalSection>
    </>
  );
}
