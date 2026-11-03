import Link from "next/link";

import { BlogFlow } from "@/components/blog/BlogFlow";
import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * Practical piece on reviewing product listings. No external sources and no
 * figures. Product claims match the landing page and lib/plans.ts: scans on a
 * schedule, an email with a count and a link, source locations on paid plans,
 * public indexed pages only. The example is labelled as illustrative.
 */
export function ArtForSaleOnlinePost() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Seeing your illustration on a product you did not create raises an
        immediate question: who is selling it, and do they have permission?
        Sometimes the answer is straightforward: it is your own listing or an
        authorised partner. Sometimes the image is only similar. And sometimes
        you have found a use that needs closer attention.
      </p>

      <LegalSection heading="The short answer">
        <p>
          <strong className={STRONG}>
            Start with your original artwork, look for possible matches, and
            examine the listing behind each result.
          </strong>{" "}
          The image helps you identify the work. The page tells you how it is
          being offered. Your own records help you determine whether that use was
          authorised.
        </p>
        <p>
          A product listing can show that an item is offered for sale. It does
          not, by itself, establish that anyone has bought it, or that the
          seller lacks permission. Keeping those questions separate makes your
          review more useful.
        </p>
      </LegalSection>

      <LegalSection heading="Start with the artwork, not the seller's product name">
        <p>
          A seller may give a product a title that has nothing to do with yours.
          Your illustration called &ldquo;Evening Garden&rdquo; could appear on a
          listing titled &ldquo;Floral Wall Decor&rdquo;. Your artist name may
          not appear at all.
        </p>
        <p>
          That is why checking the image itself is a useful starting point.
          Choose the original artwork you want to monitor rather than relying
          only on its title, tags or caption.
        </p>
        <p>
          In TraceMyAssets, add your original and review possible matches against
          it. If you have a large portfolio, begin with a commercially important
          piece or one you have previously found used without permission.
        </p>
      </LegalSection>

      <LegalSection heading="A copy may appear inside a product photo">
        <p>
          You might recognise your artwork on a framed print, a shirt, a mug or a
          digital-download preview. The surrounding image may look quite
          different from your original: a room scene, fabric folds, packaging or
          a seller&apos;s branding can take up much of the picture.
        </p>
        <p>
          When reviewing a possible match, focus on the artwork within the
          product. Compare distinctive details: the arrangement of objects, the
          line work, unusual shapes and small features that occur together in
          your original.
        </p>
        <p>
          A shared subject is not enough. Two illustrations of a fox surrounded
          by flowers may be different works. Look for specific correspondences,
          and keep uncertainty in your notes when the image is too small or
          obscured to assess. Product mockups and substantial edits can also make
          discovery harder. Do not assume a monitoring service will recognise
          every version of an artwork.
        </p>
        <BlogFlow
          title="From possible match to a useful decision"
          steps={[
            {
              title: "Compare the artwork",
              text: "Check distinctive details, not just the subject or colour palette.",
            },
            {
              title: "Read the product listing",
              text: "Identify the seller, item, price and what is actually being offered.",
            },
            {
              title: "Check your permissions record",
              text: "Your shop? An approved partner? A use you cannot account for?",
            },
          ]}
          ending="Known use: note it · Unclear use: investigate · Concern: preserve the details"
          caption="An original review workflow. A visual match is a starting point, not a finding of infringement."
        />
      </LegalSection>

      <LegalSection heading="Read what the page is actually selling">
        <p>
          A thumbnail gives you very little context. Where the source page is
          available, look at the listing itself before deciding what it means.
        </p>
        <LegalList
          items={[
            <>
              <strong className={STRONG}>The item:</strong> is it a physical
              print, a printed product, a digital file or something else?
            </>,
            <>
              <strong className={STRONG}>The offer:</strong> is there a price and
              a purchase option, or are you looking at an old, unavailable
              listing?
            </>,
            <>
              <strong className={STRONG}>The seller:</strong> does the shop name
              match a partner, distributor or account you recognise?
            </>,
            <>
              <strong className={STRONG}>The description:</strong> what does the
              seller say the buyer will receive?
            </>,
          ]}
        />
        <p>
          For example, a room photo might show your print in the background while
          the listing sells the frame. Another page might offer the artwork
          itself as a downloadable file. Those are different situations and
          deserve separate notes.
        </p>
        <p>
          TraceMyAssets shows where a match was found on paid plans. See{" "}
          <Link href="/pricing" className={LINK}>
            the plan comparison
          </Link>{" "}
          for access details before choosing the workflow you need.
        </p>
      </LegalSection>

      <LegalSection heading="Separate “my artwork” from “an unauthorised use”">
        <p>
          Recognising your work answers only the first question. Next, check your
          own records: your shop accounts, licensing arrangements and any
          permissions you have given.
        </p>
        <p>
          An unfamiliar shop name may still belong to an approved partner.
          Equally, a credit line with your name does not tell you what
          permission, if any, you granted. Compare what you see with the actual
          arrangement.
        </p>
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <strong className={STRONG}>
            Illustrative example, not a real detection result.
          </strong>{" "}
          You recognise your bird illustration on two listings. One belongs to a
          print partner you authorised. The other offers a digital file through a
          shop you do not recognise. The images may both match your original, but
          the next steps differ. Record the first as a known use. Save the
          details of the second and check your records before deciding how to
          respond.
        </p>
      </LegalSection>

      <LegalSection heading="Save the details before the listing changes">
        <p>
          If a listing needs investigation, keep its address, the seller name,
          the date you checked it and screenshots showing the artwork in the
          context of the offer. Keep your original file and relevant permission
          records alongside those notes.
        </p>
        <p>
          Describe what you can observe. &ldquo;Listed for sale at this price on
          this date&rdquo; is more precise than &ldquo;they have sold hundreds of
          copies&rdquo; when you do not have reliable sales evidence.
        </p>
        <p>
          For the next stage, use our guide to{" "}
          <Link
            href="/guides/what-to-do-when-you-find-a-copy-of-your-artwork"
            className={LINK}
          >
            what to do when you find a copy of your artwork
          </Link>
          . Platform-specific reporting steps are collected in{" "}
          <Link href="/guides" className={LINK}>
            the Guides section
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Keep checking after the first search">
        <p>
          A check answers what the search sources can surface at that moment. A
          listing published later, or not yet indexed, may not appear in those
          results.
        </p>
        <p>
          TraceMyAssets can repeat scans on a schedule you choose and email you a
          count and a link when a scheduled scan finds something new. You review
          the possible matches and decide what needs attention.
        </p>
        <p>
          The service looks at public pages indexed by its search sources. It
          does not connect directly to every marketplace, see private groups or
          guarantee discovery of every copy. A newly discovered page is not
          necessarily a newly published page. Read{" "}
          <Link href="/#sources" className={LINK}>
            where we look
          </Link>{" "}
          for the scope of the searches.
        </p>
        <p>
          If your first check finds nothing, keep that result in perspective. It
          is not confirmation that nobody is offering your art elsewhere.
        </p>
      </LegalSection>
    </>
  );
}
