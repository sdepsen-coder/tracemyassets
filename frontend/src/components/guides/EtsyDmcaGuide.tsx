import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";
import { ETSY_TRADEMARK_NOTICE } from "@/lib/site";

const LINK = "text-[var(--primary)] underline";

/**
 * General information, not legal advice. The list of notice elements follows
 * Etsy's IP policy and 17 U.S.C. 512(c)(3) (checked 2026-10-27). Etsy does not
 * state review times, so none are promised. Platform pages change: the guide
 * tells the reader to check Etsy's current page before filing.
 */
export function EtsyDmcaGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You found your illustration on a mug in someone else&apos;s Etsy shop.
        There is a standard, free way to report it: a DMCA takedown notice. This
        guide covers what Etsy asks for and how to get it right the first time.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. The DMCA is a US law. If you are
        outside the US the process still works on US platforms such as Etsy, but
        your own country&apos;s rules may add options. Platform policies change,
        so check Etsy&apos;s current page before you file.
      </p>

      <LegalSection heading="Before you file: collect your evidence">
        <p>Open the listing and save:</p>
        <LegalList
          items={[
            "The listing URL for every item that uses your work. Etsy needs the specific URLs, not just the shop name.",
            "Screenshots of the listing, showing the date.",
            "Your original file and, if you have them, sketches, work-in-progress or layered source files with dates.",
            "A link to where you first published the work: your portfolio, Instagram, a dated post.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What an Etsy DMCA notice must contain">
        <p>
          Etsy&apos;s IP policy lists these elements. They mirror what US law
          requires in 17 U.S.C. 512(c)(3).
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong className="text-[var(--text)]">A signature</strong> of a
            person authorised to act for the copyright owner. A typed name is
            accepted.
          </li>
          <li>
            <strong className="text-[var(--text)]">
              Identification of your copyrighted work
            </strong>
            , in enough detail that Etsy can tell what it is.
          </li>
          <li>
            <strong className="text-[var(--text)]">
              Identification of the material and where it is
            </strong>
            : the Etsy listing URL for each item.
          </li>
          <li>
            <strong className="text-[var(--text)]">Contact details</strong>: the
            owner&apos;s name, plus the notifier&apos;s name, address, phone
            number and email.
          </li>
          <li>
            <strong className="text-[var(--text)]">A good-faith statement</strong>{" "}
            that the use is not authorised by the owner, its agent or the law.
          </li>
          <li>
            <strong className="text-[var(--text)]">An accuracy statement</strong>
            , made under penalty of perjury, that the information is accurate and
            that you are authorised to act for the owner.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="Where to send it">
        <LegalList
          items={[
            "Preferred: Etsy's Reporting Portal (etsy.com/ipreporting).",
            "If you cannot use the portal: email legal@etsy.com.",
            "By post: Etsy, Inc., Attn: Legal Department, 117 Adams Street, Brooklyn, NY 11201, USA.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What happens next">
        <p>
          Etsy emails the affected seller about the notice and the takedown. That
          email contains a link the seller can use to file a counter-notice. A
          counter-notice has to include a statement under penalty of perjury that
          the removal was a mistake or misidentification, the seller&apos;s
          consent to the jurisdiction of a US federal court (or, for a seller
          outside the US, a district where Etsy is located) and agreement to
          accept service of process from you.
        </p>
        <p>
          Etsy&apos;s page does not give review times or a waiting period, so do
          not count on a specific timeline. Keep your evidence organised in case
          the seller disputes the notice.
        </p>
      </LegalSection>

      <LegalSection heading="False notices have consequences">
        <p>
          Under 17 U.S.C. 512(f), someone who knowingly and materially
          misrepresents that material is infringing can be liable for damages,
          including costs and attorneys&apos; fees. Etsy also says abusive or
          fraudulent notices may lead to account termination. If you are unsure
          whether a use is a copy you did not allow (for example a clear parody
          or a licensed use), check first.
        </p>
      </LegalSection>

      <LegalSection heading="Tips that save time">
        <LegalList
          items={[
            "Send one notice per work and list all the listing URLs for it together.",
            "Keep the wording factual: “This listing reproduces my illustration titled X, first published on [date] at [URL].”",
            "Save the confirmation email and any reference number.",
            "Set a reminder to re-check the shop after a week, since copies often reappear under new listings.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Finding the copies in the first place">
        <p>
          Most copies are found by accident. A reverse image search such as
          Google Lens or TinEye helps, but it only checks when you remember to.
          TraceMyAssets looks for possible copies of the artworks you register,
          and its monitoring repeats the scan on a schedule you choose. A match is
          a possible match, never proof, and we only see public pages that a
          search engine indexes. You decide what to do and you send everything
          yourself; TraceMyAssets never contacts anyone for you.
        </p>
        <p>
          See{" "}
          <Link href="/guides/what-to-do-when-you-find-a-copy-of-your-artwork" className={LINK}>
            what to do when you find a copy of your artwork
          </Link>
          , or the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <p className="text-[12px] text-[var(--text-muted)]">{ETSY_TRADEMARK_NOTICE}</p>
    </>
  );
}
