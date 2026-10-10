import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import { OperatorNotice } from "@/components/legal/OperatorNotice";
import {
  CONTACT_EMAIL,
  ETSY_TRADEMARK_NOTICE,
  LEGAL_LAST_UPDATED,
  SITE_NAME,
} from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms — ${SITE_NAME}`,
  description: `Terms of use for ${SITE_NAME}: the service, plans and credits, payments, refunds and acceptable use.`,
  alternates: { canonical: "/terms" },
};

const LINK = "text-[var(--primary)] underline";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated={LEGAL_LAST_UPDATED}>
      <LegalSection heading="Who we are">
        <OperatorNotice />
        <p>
          {SITE_NAME} is run by a sole trader based in the United Kingdom
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). These terms are between you and
          us. By creating an account or using the service you agree to them.
        </p>
      </LegalSection>

      <LegalSection heading="The service">
        <p>
          {SITE_NAME} lets you register your own artwork, create a protected
          copy with an invisible watermark, and review possible copies found
          online. It is currently in beta. It is provided &ldquo;as is&rdquo;,
          without any guarantee of availability, accuracy or results, and
          features, limits and plans may change while we develop it. We will
          not make a change that takes away credits you have already paid
          for.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <LegalList
          items={[
            "Give accurate details and keep your password safe. You are responsible for what happens under your account.",
            "One person, one account. Creating several accounts to collect free credits or to get round plan limits is not allowed.",
            "You can delete your account and download your data yourself from Account and data in the menu.",
          ]}
        />
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

      <LegalSection heading="Plans, credits and prices">
        <LegalList
          items={[
            <>
              The plans, their limits (such as the number of artworks and
              hand-started scans) and their prices are shown on the{" "}
              <Link href="/pricing" className={LINK}>
                Pricing
              </Link>{" "}
              page. Prices are in US dollars; taxes are added or included at
              checkout where required.
            </>,
            "Paid plans renew automatically every month, or every year if you choose a yearly plan, until you cancel. The price you agreed to does not change during a billing period.",
            "A Deep scan costs one credit for one artwork. Automatic checks and scans that fail do not use credits.",
            "Credits are a right to use the Deep scan feature of the service. They have no cash value, cannot be transferred or sold, and cannot be exchanged for money except as set out in the Refund Policy.",
            "Paid plans add the number of Deep scan credits shown on the Pricing page at the start of each billing month (on a yearly plan too: monthly, not all at once). These monthly credits do not carry over to the next month.",
            "Free welcome credits are given once per person and expire only if the account is closed. Credits you buy do not expire while your account is open.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          When paid plans open, payments are handled by our payment provider,
          who acts as the seller of record, takes the payment, issues the
          receipt and deals with sales tax and VAT. Their checkout terms
          apply to the payment itself. We never see or store your full card
          details.
        </p>
      </LegalSection>

      <LegalSection heading="Cancelling and refunds">
        <p>
          You can cancel a paid plan at any time; it stays active until the
          end of the period you have paid for, and no further payments are
          taken. Refunds are covered by our{" "}
          <Link href="/refunds" className={LINK}>
            Refund Policy
          </Link>
          . Nothing in these terms limits your statutory rights as a
          consumer.
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
        <p>
          We may suspend or close accounts that break these terms. If we
          close an account for a reason that is not your fault, we will
          refund unused paid credits.
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
          consequential loss, or for loss of profit, arising from use of the
          service, and our total liability to you for any claim is limited to
          the amount you paid us in the 12 months before it. Nothing in these
          terms limits liability that cannot be limited by law, including for
          death or personal injury caused by negligence or for fraud.
        </p>
      </LegalSection>

      <LegalSection heading="Changes, law and contact">
        <p>
          We may update these terms as the service develops; if a change
          matters to you we will tell you in the app or by email, and
          continuing to use the service means you accept the updated terms.
          These terms are governed by the laws of England and Wales, and the
          courts of England and Wales can hear disputes, without affecting
          any rights you have to use the courts where you live.
        </p>
        <p>
          {CONTACT_EMAIL ? (
            <>
              Questions:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
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
