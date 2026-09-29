import type { Metadata } from "next";

import {
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import {
  CONTACT_EMAIL,
  ETSY_TRADEMARK_NOTICE,
  LEGAL_LAST_UPDATED,
  SITE_NAME,
} from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms — ${SITE_NAME}`,
  description: `Terms of use for the ${SITE_NAME} beta.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated={LEGAL_LAST_UPDATED}>
      <LegalSection heading="Beta service">
        <p>
          {SITE_NAME} is in private beta. It is provided &ldquo;as is&rdquo;,
          without any guarantee of availability, accuracy or results, and
          features, limits and plans may change or be withdrawn while we
          develop it. By creating an account or using the service you agree
          to these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Your artwork">
        <LegalList
          items={[
            "Only upload work that you own or have the right to upload and monitor.",
            "You keep all rights in your artwork. You give us permission to store, process and watermark it solely to provide the service to you.",
            "You are responsible for the content you upload and for how you use the results.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What the results mean">
        <p>
          {SITE_NAME} reports technical signals: visual similarity scores and
          watermark checks. A high similarity score is not proof of copying,
          and a missing match is not proof that no copy exists. Results are
          not legal advice and not a determination of ownership or
          infringement. {SITE_NAME} never sends a warning or takedown notice
          on your behalf; any action you take against another party is your
          own decision and responsibility.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <LegalList
          items={[
            "Do not use the service to harass, target or make unfounded accusations against other people, including marketplace sellers.",
            "Do not attempt to disrupt the service, access other users' data, or bypass plan limits.",
            "Do not upload unlawful content.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Plans and limits">
        <p>
          Plans, their limits (such as the number of monitored artworks and
          scan frequency) and any pricing are described in the app and may
          change during the beta. We may suspend or remove accounts that
          break these terms.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party services and trademarks">
        <p>
          The service relies on third-party providers to look for possible
          matches, and their availability is outside our control.
          Marketplace listings and images belong to their respective owners.
        </p>
        <p>{ETSY_TRADEMARK_NOTICE}</p>
      </LegalSection>

      <LegalSection heading="Liability">
        <p>
          To the extent permitted by law, we are not liable for indirect or
          consequential loss arising from use of the beta service, and
          nothing in these terms limits liability that cannot be limited by
          law.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and contact">
        <p>
          We may update these terms as the service develops; continuing to
          use it means you accept the updated terms.{" "}
          {CONTACT_EMAIL ? (
            <>
              Questions:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[var(--primary)] underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            "Contact details will be published here shortly."
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
