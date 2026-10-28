import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * General information, not legal advice. Read from Pinterest's copyright
 * policy page on 2026-10-28: the reporting form and designated-agent address,
 * the notice contents, the "remove all Pins that contain the image" option and
 * its identical-copies limit, counter-notification (up to 14 business days),
 * strikes and the Content Claiming Portal. Nothing beyond that page is stated.
 */
export function PinterestGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Your artwork has been saved to Pinterest by people who are not you, or
        posted from a site that sells copies of it. Pinterest has a form for
        copyright reports and one option that matters for artists: asking it to
        remove every Pin that contains the same image. This guide covers what it
        asks for, what it says it can do and what it cannot.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. This follows Pinterest&apos;s
        published copyright policy as read on 28 October 2026. Policies change, so
        open Pinterest&apos;s current page before you file. Pinterest is a
        trademark of its owner; TraceMyAssets is not affiliated with it.
      </p>

      <LegalSection heading="Who can report, and where">
        <LegalList
          items={[
            "The copyright owner, or a person authorised to act for them.",
            "Pinterest's copyright reporting form, linked from its copyright policy.",
            "Or a written report to Pinterest's designated copyright agent by mail, fax or email. The policy page gives the email address copyright@pinterest.com at the time of writing.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What the report must contain">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Identification of your copyrighted work.</li>
          <li>Identification of the content on Pinterest, such as the URL of the Pin.</li>
          <li>Your mailing address, phone number and email address.</li>
          <li>A statement of good-faith belief that the use is not authorised.</li>
          <li>
            A statement, under penalty of perjury, that the information is
            accurate and that you own the work or are authorised to act for the
            owner.
          </li>
          <li>Your full legal name and an electronic or physical signature.</li>
        </ol>
        <p>
          That is the same set of elements as in our{" "}
          <Link href="/guides/dmca-takedown-notice-template-for-artists" className={LINK}>
            DMCA notice template
          </Link>
          , which you can paste from.
        </p>
      </LegalSection>

      <LegalSection heading="Removing every Pin that contains the image">
        <p>
          For images, Pinterest lets you ask it to remove all Pins that contain the
          image. It says it can remove only <strong className={STRONG}>identical</strong>{" "}
          copies, not resized or altered versions. So a cropped, resized or
          recoloured copy of your work may need its own report with its own URL.
        </p>
      </LegalSection>

      <LegalSection heading="What happens next">
        <p>
          Pinterest says it will take appropriate action, which may include
          disabling or removing the content. If it removes content, it may tell the
          person who saved it and may send them your notice, including your full
          legal name, the copyright owner and your contact details. Keep that in
          mind when you choose which address to give.
        </p>
        <p>
          A user whose Pins are removed after a notice receives a strike, and
          Pinterest says too many removals can cost a user the ability to save
          Pins or lead to account disablement. It does not say how many strikes.
        </p>
      </LegalSection>

      <LegalSection heading="If the user files a counter-notification">
        <p>
          Affected users get instructions by email. Pinterest forwards a valid
          counter-notification to you. If you do not tell Pinterest that you have
          filed a court action, or a Copyright Claims Board action, to keep the
          content down, Pinterest reinstates it. It says this process can take up
          to 14 business days. Read{" "}
          <Link href="/guides/what-to-do-if-a-seller-files-a-counter-notice" className={LINK}>
            what to do if a seller files a counter-notice
          </Link>{" "}
          before you decide.
        </p>
      </LegalSection>

      <LegalSection heading="Content Claiming Portal">
        <p>
          Exclusive copyright owners can apply for access to Pinterest&apos;s Content
          Claiming Portal. Pinterest reviews applications. Approved rights holders
          upload their original content and choose whether it appears on Pinterest,
          and that choice applies to existing and future matches. The policy page
          does not say who is accepted, so treat it as something to apply for, not
          a promise.
        </p>
      </LegalSection>

      <LegalSection heading="Be careful before you send">
        <p>
          Pinterest notes that false or bad-faith reports can carry legal and
          financial consequences. Report only what is yours and was not
          authorised. If a Pin links to a licensed use, a credit or a page where
          you gave permission, check first.
        </p>
      </LegalSection>

      <LegalSection heading="Finding Pins sooner">
        <p>
          Searching Pinterest by hand does not scale. TraceMyAssets checks the
          artworks you register on a schedule and shows possible matches for you to
          review. We only see public pages that a search engine indexes, so some
          Pins will be missed, and a match is a possible match, never proof. You
          decide what to do and you send every report yourself. See the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className={STRONG}>Does Pinterest remove resized copies too?</strong>{" "}
          Its policy says it can remove only identical copies when you ask for all
          Pins with an image. Report altered versions by their URLs.
        </p>
        <p>
          <strong className={STRONG}>Will the person who saved my work see my name?</strong>{" "}
          They may. Pinterest says it may send them the notice, including your full
          legal name and contact details.
        </p>
      </LegalSection>
    </>
  );
}
