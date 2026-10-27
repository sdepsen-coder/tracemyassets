import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * General information, not legal advice. The timing and the contents of a
 * counter-notification are from 17 U.S.C. 512(g) (checked 2026-10-27). Platform
 * practice differs and non-US law differs, so the guide says so and promises no
 * outcome or timeline beyond what the statute says.
 */
export function CounterNoticeGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You sent a takedown notice and the listing came down. Then the seller
        replies with a counter-notice. It is stressful, but there is a clear
        process. This guide explains what the counter-notice is, what the law says
        happens next, and the choices you have.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. This describes US law (17 U.S.C.
        512(g)). Platforms apply it in their own way and other countries have
        different rules, so for anything serious ask a lawyer or an artists&apos;
        rights organisation.
      </p>

      <LegalSection heading="What a counter-notice is">
        <p>
          It is the seller&apos;s written answer to your notice. To be valid under
          the law it must include:
        </p>
        <LegalList
          items={[
            "The seller's signature (physical or electronic).",
            "Identification of the removed material and where it appeared before removal.",
            "A statement, under penalty of perjury, that the seller believes the material was removed as a result of mistake or misidentification.",
            "The seller's name, address and phone number, and consent to the jurisdiction of a US federal court, plus agreement to accept service of process from you.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What the law says happens next">
        <p>
          The platform passes a copy of the counter-notice to you and tells the
          seller it will put the material back in 10 business days. It must put the
          material back not less than 10 and not more than 14 business days after
          it receives the counter-notice, unless you tell the platform within that
          time that you have started a court action to stop the seller.
        </p>
        <p>
          So the listing may come back unless you either start a court action or
          decide not to pursue the matter. Platforms can also have their own rules
          on top of this, so read the message you receive from them.
        </p>
      </LegalSection>

      <LegalSection heading="Step 1: read it calmly and check your facts">
        <LegalList
          items={[
            "Compare the listing with your original again. Is it really your work, or only similar?",
            "Look at what the seller says: a licence, a mistake, a different artist, or a claim of their own?",
            "Check your evidence: working files, dates and first publication (see how to prove you made your artwork).",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Step 2: choose your path">
        <p>
          <strong className="text-[var(--text)]">If you now think it was a mistake</strong>{" "}
          (a licensed use, a misidentified design), let it go and, if you can, tell
          the platform that you withdraw the notice. A claim that you know is wrong
          can create liability under 17 U.S.C. 512(f).
        </p>
        <p>
          <strong className="text-[var(--text)]">If you are sure the work is yours and the use was not allowed,</strong>{" "}
          the next step is a court action. That usually needs a lawyer, costs money
          and takes time, and the cost may be more than the value of the sale.
          Talk to an expert before deciding. Some artists&apos; rights
          organisations give advice to members.
        </p>
        <p>
          <strong className="text-[var(--text)]">If you are not sure,</strong> do not
          escalate. Gather more evidence first. It is fine to take time over this.
        </p>
      </LegalSection>

      <LegalSection heading="Step 3: other routes that may still work">
        <LegalList
          items={[
            "A polite direct message to the seller, if you have not tried one. Sometimes the conversation ends the matter.",
            "A report to the host of the seller's own website, if they sell from one.",
            "Other platforms where the same copy is sold: a counter-notice on one platform does not stop a notice on another.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What to avoid">
        <LegalList
          items={[
            "Threats or public accusations before you know the facts.",
            "Filing the same notice again as if nothing happened.",
            "Statements you cannot support: describe what you can show.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Keep a record, and find copies sooner">
        <p>
          Note the dates of your notice, the platform&apos;s reply and the
          counter-notice. If you want help noticing copies earlier, TraceMyAssets
          checks the artworks you register on a schedule and shows possible matches
          for you to review. A match is a possible match, never proof, and we only
          see public pages that a search engine indexes. You decide what to do and
          you send everything yourself.
        </p>
        <p>
          See{" "}
          <Link href="/guides/how-to-file-a-dmca-takedown-on-etsy" className={LINK}>
            how to file a DMCA takedown on Etsy
          </Link>{" "}
          and{" "}
          <Link
            href="/guides/what-to-do-when-you-find-a-copy-of-your-artwork"
            className={LINK}
          >
            what to do when you find a copy of your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className="text-[var(--text)]">Does the listing always come back?</strong>{" "}
          Under US law the platform must restore it after 10 to 14 business days
          unless you tell it you have started a court action. Platforms may have
          their own rules as well.
        </p>
        <p>
          <strong className="text-[var(--text)]">Do I need a lawyer?</strong> You do
          not need one to receive a counter-notice, but a court action usually
          needs one. If the matter is worth it to you, ask for advice early.
        </p>
      </LegalSection>
    </>
  );
}
