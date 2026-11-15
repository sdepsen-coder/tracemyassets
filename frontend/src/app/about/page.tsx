import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { OperatorNotice } from "@/components/legal/OperatorNotice";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const DESCRIPTION = `Who runs ${SITE_NAME}, what it does for artists, what it cannot do, and how to reach the founder.`;

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: `About — ${SITE_NAME}`, description: DESCRIPTION },
};

const LINK = "text-[var(--primary)] underline underline-offset-4";

/**
 * Who is behind the service and what it stands for. Everything here is
 * already true elsewhere on the site (Terms, Privacy, Help): no numbers,
 * quotes or claims that are not backed by the product.
 */
export default function AboutPage() {
  return (
    <LegalPage title={`About ${SITE_NAME}`} active="about">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: `${SITE_URL}/about`,
          name: `About ${SITE_NAME}`,
          about: { "@id": `${SITE_URL}/#organization` },
        }}
      />

      <p className="max-w-2xl text-[17px] leading-8 text-[var(--text-muted)]">
        {SITE_NAME} is a web watcher for people who make pictures:
        illustrators, photographers, designers and sellers of digital art.
        You register an artwork once; we keep searching the public web for
        copies of it and tell you when a scheduled scan finds something new.
      </p>

      <LegalSection heading="Who runs it">
        <OperatorNotice />
        <p>
          {SITE_NAME} is a small, independent service built and run by its
          founder in the United Kingdom. There is no sales team and no
          outsourced support: when you write to us, the person who built the
          product answers.
        </p>
      </LegalSection>

      <LegalSection heading="What it does">
        <LegalList
          items={[
            "Keeps your original private and gives you a copy with an invisible watermark to share instead.",
            "Scans the public web for your image on a schedule you choose, and on demand.",
            "Compares every search result with your original before showing it as a possible match.",
            "Shows both images side by side, how strong the match is and whether your watermark is inside, so you can decide what to do.",
          ]}
        />
        <p>
          The details are on the{" "}
          <Link href="/#how-it-works" className={LINK}>
            home page
          </Link>{" "}
          and in{" "}
          <Link href="/help" className={LINK}>
            Help
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What we will not claim">
        <LegalList
          items={[
            "A match is a possible match, never proof of copying or unlicensed use. You review it and decide.",
            "We search only public pages that a search engine has indexed. No match does not prove that no copy exists.",
            "The invisible watermark is lost by many ordinary edits such as resizing and cropping. We publish our test results, including the failures.",
            "We never contact anyone on your behalf, and we do not send takedown notices for you.",
            "We do not sell your data or use your artwork to train models.",
          ]}
        />
        <p>
          See{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>{" "}
          for the measured results, and the{" "}
          <Link href="/privacy" className={LINK}>
            Privacy Policy
          </Link>{" "}
          for exactly which services see your image.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          {CONTACT_EMAIL ? (
            <>
              Questions, feedback or a problem:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
                {CONTACT_EMAIL}
              </a>
              . More ways to get help are on the{" "}
            </>
          ) : (
            <>Ways to get help are on the </>
          )}
          <Link href="/support" className={LINK}>
            Support page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
