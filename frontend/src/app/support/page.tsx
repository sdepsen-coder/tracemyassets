import type { Metadata } from "next";

import {
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Support — ${SITE_NAME}`,
  description: `Get help with ${SITE_NAME}.`,
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <LegalPage title="Support">
      <LegalSection heading="Contact us">
        <p>
          {SITE_NAME} is in private beta and support is handled directly by
          the founder.{" "}
          {CONTACT_EMAIL ? (
            <>
              Email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[var(--primary)] underline"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and include the email address of your account and, where
              relevant, the artwork number shown in your dashboard.
            </>
          ) : (
            "Contact details will be published here shortly."
          )}
        </p>
      </LegalSection>

      <LegalSection heading="Common questions">
        <LegalList
          items={[
            "Why did a scan find nothing? Discovery works by searching supported sources and comparing what it finds against your artwork. Not every copy is findable, so no result does not mean no copy exists.",
            "Does a match mean my work was copied? Not by itself. Matches are technical similarity signals for you to review; you decide what, if anything, to do.",
            "How do I remove an artwork? Use Delete on the artwork in your dashboard. It permanently removes the artwork, its files, scans and matches.",
            "How do I delete my account? Contact us at the address above.",
            "Someone is using my work and I want to report it. Report it directly to the marketplace or website concerned; each has its own copyright or intellectual-property process.",
          ]}
        />
      </LegalSection>
    </LegalPage>
  );
}
