import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import { OperatorNotice } from "@/components/legal/OperatorNotice";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Refund Policy — ${SITE_NAME}`,
  description: `How to cancel a ${SITE_NAME} plan and when you can get a refund: 14 days for credits you have not used.`,
  alternates: { canonical: "/refunds" },
};

const LINK = "text-[var(--primary)] underline";

export default function RefundsPage() {
  return (
    <LegalPage title="Cancellation and Refund Policy" updated={LEGAL_LAST_UPDATED}>
      <OperatorNotice />

      <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
        Paid plans and credit packs are not open yet. This policy applies from
        the day they open.
      </p>

      <LegalSection heading="The short version">
        <LegalList
          items={[
            "You can cancel a paid plan at any time. It stays active until the end of the period you paid for.",
            "You can ask for a refund within 14 days of a purchase if you have not used the credits it gave you.",
            "Credits you have already used are not refunded, because the scans have been run.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Cancelling a plan">
        <p>
          Cancel from your account in the app or by writing to us. After you cancel, no further payments are taken and your plan
          stays active until the end of the billing period you have already
          paid for. Then the account returns to the Free plan: your artworks
          and results stay, but the Free limits apply.
        </p>
      </LegalSection>

      <LegalSection heading="Refunds">
        <LegalList
          items={[
            "Credit packs: within 14 days of buying, you can get a full refund of a pack if none of its credits have been used. If some were used, you can ask for a refund of the unused part.",
            "Monthly plans: within 14 days of a payment (the first one or a renewal), you can ask for a refund of that payment if you have not used any Deep scan credits from it. Cancel before the renewal date if you do not want to be charged again.",
            "Yearly plans: within 14 days of a payment (the first one or a renewal), you can ask for a full refund if you have not used any Deep scan credits from it. After that, cancelling stops the next renewal and the plan stays active until the end of the year you paid for; the unused months are not refunded.",
            "Scans that fail or return an error do not use credits, so there is nothing to refund; credits taken by a failed scan are returned automatically.",
            "Free welcome credits have no cash value and are not refunded.",
            "If we close your account for a reason that is not your fault, or the service cannot do what we described, we will refund unused paid credits.",
          ]}
        />
        <p>
          Please tell us if something did not work as expected; if there is a
          problem on our side we would rather fix it. Nothing here affects
          your statutory rights as a consumer.
        </p>
      </LegalSection>

      <LegalSection heading="How to ask">
        <p>
          Write to{" "}
          {CONTACT_EMAIL ? (
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              {CONTACT_EMAIL}
            </a>
          ) : (
            "us"
          )}{" "}
          from the email address of your account, with the date of the
          purchase. We aim to answer within 3 working days. Refunds go back
          to the original payment method through our payment provider and
          usually arrive within 5 to 10 working days, depending on your
          bank.
        </p>
        <p>
          See also the{" "}
          <Link href="/terms" className={LINK}>
            Terms of Use
          </Link>{" "}
          and the{" "}
          <Link href="/pricing" className={LINK}>
            Pricing
          </Link>{" "}
          page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
