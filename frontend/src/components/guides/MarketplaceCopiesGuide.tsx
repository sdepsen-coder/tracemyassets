import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * General information, not legal advice. Temu and Redbubble details come from
 * their published IP policies (checked 2026-10-27). Amazon's form steps were
 * not verified, so the guide says so and sends the reader to the form itself.
 * No removal times are promised: Temu's page gives none.
 */
export function MarketplaceCopiesGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Marketplaces and print-on-demand sites make it easy for anyone to put an
        image on a phone case, tote or poster. Sometimes that includes your
        image. The big platforms each have a copyright reporting route, and the
        core of every notice is the same.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. Platform policies change, so
        check each platform&apos;s current page before filing. Temu, Redbubble
        and Amazon are trademarks of their owners; TraceMyAssets is not
        affiliated with them.
      </p>

      <LegalSection heading="The core of every notice">
        <p>
          Whatever the platform, a DMCA-style notice needs these things (17
          U.S.C. 512(c)(3)):
        </p>
        <LegalList
          items={[
            "Your signature (electronic is fine).",
            "Identification of your work.",
            "Identification and location (URL) of each item that uses it.",
            "Your contact details.",
            "A good-faith statement that the use is not authorised.",
            "A statement, under penalty of perjury, that the information is accurate and that you are authorised to act for the owner.",
          ]}
        />
        <p>Prepare these once and adapt them for each platform.</p>
      </LegalSection>

      <LegalSection heading="Temu">
        <p>
          Temu&apos;s intellectual property policy says to submit reports through
          its IP Portal (you must be logged in). If you cannot use the portal,
          you can send the same information to its DMCA Designated Agent, whose
          details are on Temu&apos;s policy page. A report should include:
        </p>
        <LegalList
          items={[
            "Specific identification of your work: a registration number if you have one, a description, a link to the work and its first publication date.",
            "The nature of the problem: the product, its packaging, or the product page's images or text.",
            "The URLs of the product pages and the names of the sellers.",
            "Supporting documents, such as order IDs for test purchases.",
            "Your name, address, phone and email.",
          ]}
        />
        <p>
          Temu may ask you to verify your rights. Reports must be made in good
          faith and sworn under penalty of perjury. Temu says it may reject
          reports it considers false, incomplete or made in bad faith, and that
          repeated inaccurate notices can cost you your submission privileges.
          It also says it may terminate repeat infringers. The page gives no
          timelines.
        </p>
      </LegalSection>

      <LegalSection heading="Redbubble">
        <p>
          Redbubble&apos;s policy is explicit that only the rights holder, or
          someone acting for them such as an attorney, can lodge a valid takedown
          notice, because only the owner knows whether a licence or fair use might
          apply. Use the reporting route in Redbubble&apos;s IP policy and help
          centre, and have your proof of ownership ready. The help centre also
          has an article for artists whose work appears elsewhere on the internet
          without permission.
        </p>
      </LegalSection>

      <LegalSection heading="Amazon">
        <p>
          Amazon provides a &ldquo;Report Infringement&rdquo; form for rights
          owners, which you can find in its help pages. We have not verified the
          form&apos;s current steps for this guide, so open it and follow what it
          asks for. Have your work, the product listing URL (the ASIN page) and
          your contact details ready.
        </p>
      </LegalSection>

      <LegalSection heading="Build a repeatable routine">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong className="text-[var(--text)]">Save evidence first:</strong>{" "}
            screenshot the listing with the date, URL and seller name.
          </li>
          <li>
            <strong className="text-[var(--text)]">Document ownership:</strong>{" "}
            original files, dated drafts, a first-publication link.
          </li>
          <li>
            <strong className="text-[var(--text)]">
              File one notice per platform
            </strong>
            , listing every URL for the work.
          </li>
          <li>
            <strong className="text-[var(--text)]">Log it:</strong> date sent,
            reference number, outcome.
          </li>
          <li>
            <strong className="text-[var(--text)]">Re-check in a week.</strong>{" "}
            Copies often come back under new listings.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="When to be careful">
        <p>
          If a listing might be licensed, a clear fair-use case, or just a very
          similar but independent design, pause. A false claim can create real
          liability (17 U.S.C. 512(f)), so only report what you are confident is
          yours and was not authorised.
        </p>
      </LegalSection>

      <LegalSection heading="Finding copies sooner">
        <p>
          Searching each marketplace by hand does not scale. TraceMyAssets looks
          for possible copies of the artworks you register, and its monitoring
          repeats the scan on a schedule you choose, so you can spot them earlier.
          A match is a possible match, never proof, and we only see public pages
          that a search engine indexes. Then you decide what to do.
        </p>
        <p>
          See{" "}
          <Link href="/guides/what-to-do-when-you-find-a-copy-of-your-artwork" className={LINK}>
            what to do when you find a copy of your artwork
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
