import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { CreditPacks } from "@/components/billing/CreditPacks";
import { PlanCards } from "@/components/pricing/PlanCards";
import { PRICING_NOTE } from "@/lib/plans";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Pricing — ${SITE_NAME}`,
  description: `Free, Pro and Extra plans for ${SITE_NAME}: how many artworks, scans and Deep scan credits each includes.`,
  alternates: { canonical: "/pricing" },
};

const QUESTIONS: Array<{ question: string; answer: string }> = [
  {
    question: "Can I use it for free?",
    answer:
      "Yes. The Free plan needs no card. You can register up to 3 artworks and start 5 Standard scans a month yourself.",
  },
  {
    question: "When can I upgrade?",
    answer:
      "Create a free account, then choose Pro or Extra on this page. Nothing is charged until you confirm in the payment window.",
  },
  {
    question: "What is a Deep scan, and what are credits?",
    answer:
      "A Deep scan looks further than the Standard scan and costs real money to run, so it is paid for with credits: one credit for one artwork. Every new account gets 3 credits once. Pro adds 10 credits every month and Extra adds 40; the monthly credits do not carry over to the next month. If you need more, you can buy extra credits in packs of 10, 25 or 60. They are a one-time payment and never expire.",
  },
  {
    question: "Is there a yearly option?",
    answer:
      "Yes. Pro is $120 a year and Extra is $240 a year, instead of paying month by month. Use the Monthly / Yearly switch above the plans to compare.",
  },
  {
    question: "Why is the source hidden on Free?",
    answer:
      "On Free you still see that a possible copy exists and how strong the signal is, so you can judge whether it matters. The page where it was found is shown on Pro and Extra.",
  },
  {
    question: "What about cancelling and refunds?",
    answer:
      "You can cancel a paid plan at any time and it stays active until the end of the period you paid for. Within 14 days of a purchase you can get a refund for credits you have not used. The full details are in the Refund Policy.",
  },
];

export default function PricingPage() {
  return (
    <LegalPage title="Pricing" wide>
      <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)]">
        Start free and see what {SITE_NAME} finds for your work. Paid plans
        add room for more artworks, more scans and the exact pages where your
        images appear.
      </p>

      <PlanCards />

      <section data-testid="credit-packs-section" className="space-y-3">
        <h2 className="font-heading text-[26px] font-light tracking-[-0.02em] text-[var(--text)]">
          Need more Deep scans?
        </h2>
        <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--text-muted)]">
          Buy extra Deep scan credits whenever you like, with or without a
          plan. They are a one-time payment and never expire; monthly plan
          credits are used first.
        </p>
        <CreditPacks showSignedOutHint />
      </section>

      <p
        data-testid="pricing-note"
        className="rounded-card bg-[var(--surface-muted)] p-5 text-[13px] leading-relaxed text-[var(--text-muted)]"
      >
        {PRICING_NOTE}
      </p>

      <LegalSection heading="Questions about plans">
        <div className="glass divide-y divide-[var(--border)] rounded-card border border-[var(--border)]">
          {QUESTIONS.map((item) => (
            <div key={item.question} className="px-5 py-5">
              <h3 className="text-[16px] font-medium text-[var(--text)]">
                {item.question}
              </h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[var(--text-muted)]">
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[14px]">
          More answers are on the{" "}
          <Link href="/help" className="text-[var(--primary)] underline">
            Help
          </Link>{" "}
          page
          {CONTACT_EMAIL ? (
            <>
              , or write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[var(--primary)] underline"
              >
                {CONTACT_EMAIL}
              </a>
            </>
          ) : null}
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
