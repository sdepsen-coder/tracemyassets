import Link from "next/link";
import type { ReactNode } from "react";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={LINK} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Researched piece (checked 2026-10-28). Sources read: UK Electronic Commerce
 * (EC Directive) Regulations 2002 regs 19 and 22 (legislation.gov.uk); the text
 * of Digital Services Act Articles 6, 16, 17 and 20 as published on
 * eu-digital-services-act.com (EUR-Lex's own page would not load the article
 * text, and the post says so); gov.uk copyright pages; the judiciary's IPEC
 * small claims track page. It gives no deadline where the sources give none,
 * makes no claim about national law of individual EU states, and is not legal
 * advice.
 */
export function UkEuTakedownPost() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Most guides to taking down copies of your artwork are built around the
        DMCA, a US law. If you live in the UK or the EU you may wonder what your
        own law says. The answer is less tidy than the DMCA: both have the same
        basic idea, tell the host and it must act, but neither works like a
        single form with a fixed script. This piece lays out what the actual texts
        say, where they differ from the DMCA, and what that means in practice.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice, checked on 28 October 2026. Laws
        change, EU member states add their own rules, and nothing here covers your
        particular case. The limits of what we read are listed near the end.
      </p>

      <LegalSection heading="The short version">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>UK:</strong> no DMCA-style statute. A host
              is protected from damages if it does not know about unlawful content,
              or acts &ldquo;expeditiously&rdquo; once it does. A clear notice is
              how you give it that knowledge.
            </>,
            <>
              <strong className={STRONG}>EU:</strong> the Digital Services Act
              requires hosts to offer an easy electronic way to report illegal
              content, says what a notice must contain, and gives you a way to
              challenge a decision.
            </>,
            <>
              <strong className={STRONG}>For artists:</strong> the big marketplaces
              mostly run DMCA-style forms for everyone, so you will often use those
              anyway. Your own law matters for the cases they do not solve.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="The UK: a duty on the host once it knows">
        <p>
          The UK rules for online hosts sit in the Electronic Commerce (EC
          Directive) Regulations 2002. Regulation 19 says a hosting provider is not
          liable for damages or criminal sanctions for content stored by a user if
          it does not have actual knowledge of unlawful activity or information,
          or, once it has that knowledge, it acts expeditiously to remove or
          disable access to it.
        </p>
        <p>
          Regulation 22 explains how a court decides whether the host had actual
          knowledge. It looks at all the circumstances, and in particular at
          whether the host received a notice through the contact channel it
          provides and how complete that notice was: the sender&apos;s name and
          address, where the information is, and why it is unlawful.
        </p>
        <p>
          Two things stand out. There is no prescribed form and no stated deadline:
          the text says &ldquo;expeditiously&rdquo;, not a number of days. And
          nothing in these two regulations sets out a counter-notice procedure like
          the DMCA&apos;s. A complete, specific notice is simply the best way to
          make the host aware.{" "}
          <Ext href="https://www.legislation.gov.uk/uksi/2002/2013/regulation/19">
            Regulation 19
          </Ext>
          ,{" "}
          <Ext href="https://www.legislation.gov.uk/uksi/2002/2013/regulation/22">
            regulation 22
          </Ext>
          .
        </p>
        <p>
          Copyright itself needs no registration in the UK. gov.uk says protection
          arrives automatically, there is no register of copyright works, and you
          are responsible for defending your rights. It also advises checking
          whether the other party&apos;s use is allowed before you try to stop it.{" "}
          <Ext href="https://www.gov.uk/copyright">gov.uk on copyright</Ext>.
        </p>
      </LegalSection>

      <LegalSection heading="The EU: a defined notice and a way to appeal">
        <p>
          The Digital Services Act (Regulation (EU) 2022/2065) is more specific.
          Under Article 16, hosting providers must offer a mechanism that is easy
          to access and use, and that takes notices by electronic means. A notice
          should be precise and well supported, and must include:
        </p>
        <LegalList
          items={[
            "your reasons for saying the content is illegal;",
            "its exact location, such as the URL, and any other detail needed to identify it;",
            "your name and email address;",
            "a statement that you honestly believe the information and allegations in the notice are accurate and complete.",
          ]}
        />
        <p>
          A notice that lets a diligent provider identify the illegality without a
          detailed legal examination counts as giving it actual knowledge. The host
          must confirm receipt (if you gave an email address), tell you its
          decision along with how you can challenge it, and handle notices in a
          timely, diligent, non-arbitrary and objective manner. As in the UK, there
          is no fixed number of days in the text we read.
        </p>
        <p>
          Two more articles help artists. Article 17 requires the host to give the
          affected user a statement of reasons when it removes content, which should
          say whether it acted on a notice and what the user can do about it.
          Article 20 requires an internal complaint system open to users and to
          people who submitted a notice, for at least six months after a decision,
          and it covers a decision not to act on your notice.
        </p>
      </LegalSection>

      <LegalSection heading="Side by side with the DMCA">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text)]">
                <th className="py-2 pr-4 font-medium">&nbsp;</th>
                <th className="py-2 pr-4 font-medium">US (DMCA)</th>
                <th className="py-2 pr-4 font-medium">UK (2002 Regulations)</th>
                <th className="py-2 font-medium">EU (DSA)</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 text-[var(--text)]">Notice contents</td>
                <td className="py-3 pr-4">Six listed elements</td>
                <td className="py-3 pr-4">Factors a court weighs: sender, location, why unlawful</td>
                <td className="py-3">Four listed elements</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 text-[var(--text)]">Sworn statement</td>
                <td className="py-3 pr-4">Yes, under penalty of perjury</td>
                <td className="py-3 pr-4">Not required in the text we read</td>
                <td className="py-3">Statement of honest belief; no perjury wording in the article summary we read</td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4 text-[var(--text)]">Timing for the host</td>
                <td className="py-3 pr-4">Counter-notice: restore after 10 to 14 business days</td>
                <td className="py-3 pr-4">&ldquo;Expeditiously&rdquo;</td>
                <td className="py-3">&ldquo;Timely&rdquo;, &ldquo;expeditiously&rdquo;</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-[var(--text)]">Challenging a decision</td>
                <td className="py-3 pr-4">Counter-notice, then court</td>
                <td className="py-3 pr-4">Not set out in these regulations</td>
                <td className="py-3">Internal complaint, at least six months</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Our{" "}
          <Link href="/guides/what-to-do-if-a-seller-files-a-counter-notice" className={LINK}>
            counter-notice guide
          </Link>{" "}
          covers the DMCA side.
        </p>
      </LegalSection>

      <LegalSection heading="What this means for you in practice">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>Use the platform&apos;s own form first.</strong>{" "}
              Etsy, Redbubble and Temu each run a DMCA-style reporting route,
              and our guides cover them step by step. See also our{" "}
              <Link href="/guides/dmca-takedown-notice-template-for-artists" className={LINK}>
                notice template
              </Link>
              .
            </>,
            <>
              <strong className={STRONG}>Write the notice so it satisfies both.</strong>{" "}
              Your name and contact details, the exact URL, what your work is, and
              why this use is not authorised. That covers the DMCA, the DSA&apos;s
              four elements and the UK&apos;s completeness factors at once.
            </>,
            <>
              <strong className={STRONG}>In the EU, look for the notice mechanism.</strong>{" "}
              Platforms that operate there must offer one. If a platform ignores
              your notice, the internal complaint route and, beyond it, the
              out-of-court and court options named in its decision are the next
              step.
            </>,
            <>
              <strong className={STRONG}>Keep the same evidence.</strong> Working
              files, a dated first publication, screenshots and a log of what you
              sent. See{" "}
              <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
                how to prove you made your artwork
              </Link>
              .
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="When a notice is not enough, in the UK">
        <p>
          For a UK claim, the Intellectual Property Enterprise Court has a small
          claims track for straightforward cases, mainly copyright, designs,
          passing off and trade marks. Claims must be for less than £10,000, the
          parties are frequently unrepresented, hearings are short and informal,
          and the loser seldom has to pay the winner&apos;s costs. It cannot hear
          applications for an interim injunction.{" "}
          <Ext href="https://www.judiciary.uk/guidance-and-resources/intellectual-property-enterprise-court-ipec-small-claims-track/">
            IPEC small claims track
          </Ext>
          .
        </p>
        <p>
          That is a real option for a single clear case, not a reason to rush. Take
          advice from an intellectual property professional before you start;
          gov.uk&apos;s own pages say you can get advice on specific legal issues
          from one and that the IPO&apos;s helpline gives only general guidance.
        </p>
      </LegalSection>

      <LegalSection heading="Do not send a notice you are unsure about">
        <p>
          Whichever law you rely on, a notice you know is wrong can backfire. The
          DMCA has an explicit rule (17 U.S.C. 512(f)) against knowingly false
          claims, and a host that rejects a sloppy notice may be less ready to act
          on your next one. If a use might be licensed, a parody or a similar but
          independent design, check first.
        </p>
      </LegalSection>

      <LegalSection heading="What we did not check">
        <LegalList
          items={[
            "The EU text: EUR-Lex's own page would not load the article text for us, so we read Articles 6, 16, 17 and 20 as published on eu-digital-services-act.com and checked them against each other. Read the official text before you rely on a detail.",
            "National laws of individual EU states, and the separate EU copyright rules for large sharing platforms.",
            "Whether the 2002 Regulations have been amended since, or any other UK rule that adds to them.",
            "How each platform applies these rules to your notice. Their practice differs, and we found no stated deadlines.",
          ]}
        />
        <p>
          If a case matters to you, ask a solicitor or an artists&apos; rights
          organisation. This post is a map, not advice.
        </p>
      </LegalSection>

      <LegalSection heading="Finding the copies first">
        <p>
          All of this starts with knowing a copy exists. TraceMyAssets checks the
          artworks you register on a schedule and shows possible matches for you to
          review. We only see public pages that a search engine indexes, and a
          match is a possible match, never proof. You decide what to do and you
          send every notice yourself; we never contact anyone for you. See{" "}
          <Link href="/blog/three-ways-to-find-copies-of-your-artwork" className={LINK}>
            three ways to find copies of your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Sources">
        <LegalList
          items={[
            <Ext key="a" href="https://www.legislation.gov.uk/uksi/2002/2013/regulation/19">
              The Electronic Commerce (EC Directive) Regulations 2002, regulation 19
            </Ext>,
            <Ext key="b" href="https://www.legislation.gov.uk/uksi/2002/2013/regulation/22">
              The Electronic Commerce (EC Directive) Regulations 2002, regulation 22
            </Ext>,
            <Ext key="c" href="https://www.eu-digital-services-act.com/Digital_Services_Act_Article_16.html">
              Digital Services Act, Article 16 (notice and action)
            </Ext>,
            <Ext key="d" href="https://www.eu-digital-services-act.com/Digital_Services_Act_Article_17.html">
              Digital Services Act, Article 17 (statement of reasons)
            </Ext>,
            <Ext key="e" href="https://www.eu-digital-services-act.com/Digital_Services_Act_Article_20.html">
              Digital Services Act, Article 20 (internal complaints)
            </Ext>,
            <Ext key="f" href="https://www.gov.uk/copyright">gov.uk: Copyright</Ext>,
            <Ext key="g" href="https://www.judiciary.uk/guidance-and-resources/intellectual-property-enterprise-court-ipec-small-claims-track/">
              Judiciary: IPEC small claims track
            </Ext>,
          ]}
        />
      </LegalSection>
    </>
  );
}
