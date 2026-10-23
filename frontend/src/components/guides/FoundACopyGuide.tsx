import Link from "next/link";

import {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * Practical order of steps, not legal advice. The steps match the
 * "What can I do about this?" help inside the app (look first, keep evidence,
 * start with the gentlest step, know when to ask a professional). It makes no
 * claim about any platform's current form or about how long a removal takes.
 */
export function FoundACopyGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Finding a copy of your work can feel urgent. In many cases the gentlest
        step that can work is also the fastest. This guide gives a calm order to
        follow. It is practical help, not legal advice.
      </p>

      <LegalSection heading="Step 1: look first">
        <p>
          Open the page and compare it with your original. Similar is not
          always copied. Ask yourself:
        </p>
        <LegalList
          items={[
            "Is it really your work, or another artist's work that looks like it?",
            "Is it your own shop listing, a use you licensed, or a repost that credits you and that you are happy with?",
            "Is it being sold, or shown on a personal page or in a social post?",
          ]}
        />
        <p>
          A match is a possible match, never proof. Only you can decide that it
          is a use you did not allow.
        </p>
      </LegalSection>

      <LegalSection heading="Step 2: keep evidence">
        <LegalList
          items={[
            "Take a screenshot that shows the page, its address and today's date.",
            "Save the link and write down when you found it.",
            "Keep your original file and the copy you published untouched, with the date you first published it.",
            "Do not edit or crop the evidence.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Step 3: start with the gentlest step that can work">
        <p>
          A short, polite message to whoever posted it often ends the matter.
          Say what you found and where, that the work is yours, and what you
          ask for: remove it, credit you, or get in touch about a licence. Keep
          the tone calm and stick to facts you can show. Avoid threats and
          public accusations before you know the facts.
        </p>
      </LegalSection>

      <LegalSection heading="Step 4: if there is no answer, report it to the platform">
        <p>
          Marketplaces, print shops and social networks each have their own way
          to report copyright or intellectual-property problems, usually in
          their help section. Use that process rather than a general contact
          form. You will normally need the link, a way to show the work is
          yours (your original and its date), and a statement. Make only
          statements that are true: a false report can cause trouble for you.
        </p>
      </LegalSection>

      <LegalSection heading="Step 5: if the website ignores it, try its host">
        <p>
          Every site runs on a hosting company, and many hosts have a process
          for reports about content on sites they host. You can find a site&apos;s
          host with a public host lookup tool. How these reports work, and what
          they must contain, depends on the country, so read the host&apos;s own
          instructions.
        </p>
      </LegalSection>

      <LegalSection heading="Step 6: know when to ask a professional">
        <p>
          For large, commercial or repeated use, talk to a lawyer or an artists&apos;
          rights organisation in your country. Rules about copyright, licences
          and notices differ between countries, and this guide cannot tell you
          what applies to you.
        </p>
      </LegalSection>

      <LegalSection heading="What to avoid">
        <LegalList
          items={[
            "Editing or deleting your own evidence.",
            "Threats, insults or public accusations before you know the facts.",
            "Claims you cannot show: describe what you found, not what you assume.",
            "Waiting for a single message to solve everything: keep the dates of what you sent and when.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="How TraceMyAssets helps">
        <p>
          When a scan lists a possible match, open{" "}
          <strong className="text-[var(--text)]">What can I do about this?</strong>{" "}
          on its card (on plans that show where a match was found). It gives a
          short version of these steps and three letters you can copy: a polite
          message to the poster, a report to the platform, and a notice to the
          website&apos;s host. Fill in the brackets and send only what is true; they
          are starting points, not legal advice. You send everything from your own
          account. TraceMyAssets never contacts anyone for you.
        </p>
        <p>
          See{" "}
          <Link href="/guides/how-to-check-if-your-artwork-was-reposted" className={LINK}>
            how to check whether your artwork was reposted
          </Link>{" "}
          and{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>
          , or the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className="text-[var(--text)]">
            How long does it take for a copy to be removed?
          </strong>{" "}
          It depends on the person, the platform and the host. We cannot
          promise a time or a result.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Should I contact the person or the platform first?
          </strong>{" "}
          Usually the gentlest step first: a polite message to the person, then
          the platform, then the host. For serious cases, ask a professional
          before you start.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Does TraceMyAssets send the notices?
          </strong>{" "}
          No. We give you the steps and the letters. You decide and you send.
        </p>
      </LegalSection>
    </>
  );
}
