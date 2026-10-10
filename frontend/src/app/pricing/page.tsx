import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
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
      "Paid plans are not open yet. Create a free account now; the upgrade will appear in the app when paid plans open. Nothing is charged until you choose a plan.",
  },
  {
    question: "What is a Deep scan, and what are credits?",
    answer:
      "A Deep scan looks further than the Standard scan and costs real money to run, so it is paid for with credits: one credit for one artwork. Every new account gets 3 credits once. Pro adds 10 credits every month and Extra adds 40; the monthly credits do not carry over to the next month. If you need more, you will be able to buy extra credits that never expire.",
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

      <p
        data-testid="pricing-note"
        className="rounded-xl bg-[var(--surface-muted)] p-4 text-[13px] leading-relaxed text-[var(--text-muted)]"
      >
        {PRICING_NOTE}
      </p>

      <LegalSection heading="Questions about plans">
        <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {QUESTIONS.map((item) => (
            <div key={item.question} className="px-4 py-4">
              <h3 className="text-[15px] font-semibold text-[var(--text)]">
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
