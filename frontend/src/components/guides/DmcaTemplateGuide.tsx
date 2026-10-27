import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * General information, not legal advice. The six elements are from
 * 17 U.S.C. 512(c)(3)(A) and the misrepresentation rule from 512(f) (read on
 * 2026-10-27). The template only fills those elements in; it adds no legal
 * conclusions, threats or damages claims. Most platforms have their own form:
 * the guide says to use it first and treat the template as the text to paste.
 */
const TEMPLATE = `Subject: Copyright infringement notice (DMCA) - [name of your work]

To the Designated Copyright Agent of [platform name],

1. The work: I am the copyright owner of the artwork titled "[title of your work]". It was first published on [date] at [link to your first publication]. The original is shown here: [link to your portfolio page or a dated post].

2. The material: The following listing(s) use my work without my permission:
- [URL of listing 1]
- [URL of listing 2]
Seller or account name: [name shown on the listing].

3. Good-faith statement: I have a good-faith belief that this use of my work is not authorized by me, my agent, or the law.

4. Accuracy statement: The information in this notice is accurate, and, under penalty of perjury, I am the owner of the exclusive rights in the work described above, or am authorized to act on behalf of the owner.

5. Request: Please remove or disable access to the material identified above.

6. Contact: [your full name] | [email address] | [postal address] | [phone number, if you wish to give one]

Signature: /[your full name]/
Date: [date]`;

export function DmcaTemplateGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Most platforms have a form for copyright reports. Some ask for a written
        notice instead, or you may want one ready to paste into the form. This
        guide gives a plain template that covers what US law asks a notice to
        contain, tells you how to fill each part, and lists what to leave out.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. The DMCA is a US law, and other
        countries have different rules. Always check the platform&apos;s own
        reporting page first, because its form may ask for more or less.
      </p>

      <LegalSection heading="What a notice must contain">
        <p>
          US law (17 U.S.C. 512(c)(3)) lists six things. The template below
          follows them in order:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong className={STRONG}>A signature</strong> of the owner or a
            person authorised to act for them. An electronic signature is
            allowed.
          </li>
          <li>
            <strong className={STRONG}>Identification of your work.</strong> If
            one notice covers several works on a single site, a representative
            list is enough.
          </li>
          <li>
            <strong className={STRONG}>Identification of the material</strong>,
            with information reasonably sufficient for the platform to find it:
            in practice, the exact URL of each listing.
          </li>
          <li>
            <strong className={STRONG}>Your contact details</strong>: an address,
            a telephone number and, if available, an email address.
          </li>
          <li>
            <strong className={STRONG}>A good-faith statement</strong> that the
            use is not authorised by the owner, its agent or the law.
          </li>
          <li>
            <strong className={STRONG}>An accuracy statement</strong>, under
            penalty of perjury, that the information is accurate and that you are
            authorised to act for the owner.
          </li>
        </ol>
      </LegalSection>

      <LegalSection heading="The template">
        <p>
          Copy it, replace everything in square brackets, and delete any line
          that does not apply. It is a starting point, not a form that makes a
          notice valid by itself.
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[13px] leading-relaxed text-[var(--text)]">
          {TEMPLATE}
        </pre>
      </LegalSection>

      <LegalSection heading="How to fill each part">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>Title and first publication:</strong>{" "}
              use the real date and a link that shows it, such as your portfolio
              or a dated post. See{" "}
              <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
                how to prove you made your artwork
              </Link>
              .
            </>,
            <>
              <strong className={STRONG}>URLs:</strong> the address of the
              specific listing, not the shop&apos;s home page. List every listing
              that uses this work in one notice.
            </>,
            <>
              <strong className={STRONG}>Both statements:</strong> sign them only
              if they are true. If you are not sure the work is yours or whether a
              use was licensed, find out first.
            </>,
            <>
              <strong className={STRONG}>Signature:</strong> a typed full name
              between slashes is the usual electronic form.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="What to leave out">
        <LegalList
          items={[
            "Threats, insults or demands for money. A takedown notice asks for removal, nothing else.",
            "Legal conclusions you cannot support, such as claims about damages or about what a court would decide.",
            "Works that are not yours. List only your own work.",
            "A registration number if you have none. Say nothing you cannot show.",
            "More personal information than needed. See the next section.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Your contact details may be seen by the other side">
        <p>
          Platforms commonly pass a notice on to the seller. Etsy, for example,
          tells the affected seller about the notice and gives them a way to
          respond. Assume that what you write, including your contact details, may
          reach the other party, and think about which email address and postal
          address you are comfortable sharing. The law asks for contact
          information that lets the platform reach you, not necessarily your home
          address if you have a business or mailing address you can use.
        </p>
      </LegalSection>

      <LegalSection heading="Where to send it">
        <p>
          Use the platform&apos;s own copyright or intellectual property form
          first. It usually asks for the same things in separate boxes, and you
          can paste from the template. Where a platform lists a designated agent
          for written notices, send it there. The US Copyright Office keeps a
          directory of designated agents that platforms register. Platform-specific
          steps are in our guides for{" "}
          <Link href="/guides/how-to-file-a-dmca-takedown-on-etsy" className={LINK}>
            Etsy
          </Link>{" "}
          and{" "}
          <Link href="/guides/found-your-artwork-on-temu-redbubble-or-amazon" className={LINK}>
            Temu, Redbubble and Amazon
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Do not send a notice you are unsure about">
        <p>
          Under 17 U.S.C. 512(f), a person who knowingly and materially
          misrepresents that material is infringing can be liable for damages,
          including costs and attorneys&apos; fees. If a listing might be licensed,
          a clear parody, or a similar but independent design, stop and check
          before you send anything. If the seller answers with a counter-notice,
          see{" "}
          <Link href="/guides/what-to-do-if-a-seller-files-a-counter-notice" className={LINK}>
            what to do if a seller files a counter-notice
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Finding the copies">
        <p>
          A template is only useful once you know where the copies are.
          TraceMyAssets checks the artworks you register on a schedule and shows
          possible matches for you to review. We only see public pages that a
          search engine indexes, and a match is a possible match, never proof. You
          decide what to do and you send every notice yourself; we never contact
          anyone for you. See the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className={STRONG}>
            Can I send the same notice to every platform?
          </strong>{" "}
          You can reuse the text, but change the platform name and the URLs, and
          use each platform&apos;s own form first. Each platform handles notices in
          its own way.
        </p>
        <p>
          <strong className={STRONG}>Do I need a lawyer to send a notice?</strong>{" "}
          Not to send one. For anything large, commercial or disputed, ask a lawyer
          or an artists&apos; rights organisation for advice.
        </p>
      </LegalSection>
    </>
  );
}
