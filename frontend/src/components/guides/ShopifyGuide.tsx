import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * General information, not legal advice. Read from Shopify's copyright policy
 * help page on 2026-10-28: the online form (preferred), legal@ email and the
 * designated agent in Ottawa, the notice contents (direct links, not a general
 * shop link), disclosure to the merchant, counter-notice and the 10 to 14
 * business day window, and the repeat-infringer wording. Shopify sells the
 * software; each store has its own owner, so the guide says the report goes to
 * Shopify and not to the shop.
 */
export function ShopifyGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You found your artwork in an online shop built on Shopify. Many small
        shops that sell prints and products use it, and the shop owner is
        usually not Shopify. Shopify has its own copyright reporting route. This
        guide covers what it asks for and what it says happens next.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. This follows Shopify&apos;s
        published copyright policy as read on 28 October 2026. Policies change,
        so open Shopify&apos;s current page before you file. Shopify is a
        trademark of its owner; TraceMyAssets is not affiliated with it.
      </p>

      <LegalSection heading="How to tell it is a Shopify store">
        <p>
          You cannot always tell from the address, since many shops use their own
          domain. If you are unsure, look for the platform&apos;s name in the page
          footer or on the checkout page. If the shop is not on
          Shopify, use that platform&apos;s own route instead; see{" "}
          <Link href="/guides/found-your-artwork-on-temu-redbubble-or-amazon" className={LINK}>
            the marketplace guide
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Where to report">
        <LegalList
          items={[
            "Shopify's online copyright form, which it names as the preferred method.",
            "Or email legal@shopify.com, or mail a notice to its designated agent in Ottawa, Canada (details on the policy page).",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What the notice must contain">
        <LegalList
          items={[
            "Your legal name and contact details.",
            "Links to, or a description of, your original work.",
            "A direct link to each specific Shopify page with the content. Shopify says a general link to the shop is not accepted.",
            "A description of the infringing material and where it appears.",
            "A statement of good-faith belief and that the information is accurate.",
            "A statement, under penalty of perjury, that you own the copyright or are authorised to act for the owner.",
            "A physical or electronic signature.",
          ]}
        />
        <p>
          The{" "}
          <Link href="/guides/dmca-takedown-notice-template-for-artists" className={LINK}>
            DMCA notice template
          </Link>{" "}
          covers the same elements. Add one line per listing URL.
        </p>
      </LegalSection>

      <LegalSection heading="What Shopify says happens next">
        <p>
          For a complete and valid notice, Shopify says it generally removes the
          reported content and tells the merchant through their Shopify admin. It
          adds that it may decline to remove content, or let a merchant repost it
          immediately, in some cases. A copy of your notice, including your contact
          information, may be given to the person who posted the content, so
          choose the address you give with that in mind.
        </p>
      </LegalSection>

      <LegalSection heading="If the merchant files a counter-notice">
        <p>
          The merchant can send a counter-notice that identifies the removed
          content, gives their legal name and contact details, consents to a
          federal court&apos;s jurisdiction, agrees to accept service of process
          and states under penalty of perjury that the removal was a mistake or
          misidentification. Shopify sends a valid counter-notice to you. If you
          notify Shopify of legal action within 10 to 14 business days, the content
          may stay down. If not, Shopify notifies the merchant and the content may
          be reposted. Shopify says valid counter-notices generally lead to
          reposting within that window. Read{" "}
          <Link href="/guides/what-to-do-if-a-seller-files-a-counter-notice" className={LINK}>
            what to do if a seller files a counter-notice
          </Link>{" "}
          before you decide.
        </p>
      </LegalSection>

      <LegalSection heading="Repeat infringers">
        <p>
          Shopify says it terminates stores for repeat infringement in appropriate
          cases, such as when several notices against a store go uncountered, and
          that other stores run by the same person may also be terminated. It may
          disable a store after a single instance of willful or egregious
          infringement. The page does not say how many notices that takes, so
          keep reporting each listing you find. See{" "}
          <Link href="/blog/why-stolen-art-keeps-reappearing-on-print-on-demand-sites" className={LINK}>
            why stolen art keeps reappearing
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Be careful before you send">
        <p>
          Shopify says false or bad-faith notices are punishable by law and that
          harmed parties, including Shopify, may sue for damages and attorneys&apos;
          fees. Report only what is yours and was not authorised.
        </p>
      </LegalSection>

      <LegalSection heading="Finding Shopify shops sooner">
        <p>
          Small shops are hard to find by hand. TraceMyAssets checks the artworks
          you register on a schedule and shows possible matches for you to review.
          We only see public pages that a search engine indexes, so some shops will
          be missed, and a match is a possible match, never proof. You decide what
          to do and you send every notice yourself. See the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className={STRONG}>Can I send the link to the whole shop?</strong>{" "}
          No. Shopify says a general shop link is not accepted. Give the link to
          each page that uses your work.
        </p>
        <p>
          <strong className={STRONG}>How long does removal take?</strong> The page
          we read states no processing time for the initial report, only the 10 to
          14 business day counter-notice window.
        </p>
      </LegalSection>
    </>
  );
}
