import Link from "next/link";

import { BlogFlow } from "@/components/blog/BlogFlow";
import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * Practical piece on choosing a first monitoring list. No external sources and
 * no figures about how often work is copied: the selection order is a
 * suggestion, not a risk score, and the post says so. The example is labelled
 * as illustrative. Product claims match the landing page.
 */
export function MonitorFirstPost() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Your portfolio may contain years of work. Your first monitoring list does
        not need to. If you sell prints, license illustrations or run a digital
        art shop, choosing what to monitor can feel like another unfinished
        task. Do you begin with your newest collection, your most popular piece,
        or the design you once found in someone else&apos;s listing?
      </p>

      <LegalSection heading="The short answer">
        <p>
          <strong className={STRONG}>
            Start with work that has a clear reason to be watched:
          </strong>{" "}
          an artwork with a previous copying problem, a commercially important
          bestseller, or a piece you are actively promoting. Then expand your
          list as you build a routine.
        </p>
        <p>
          This is a practical way to allocate your attention, not a prediction of
          which image will be copied. You do not need a perfect ranking to make a
          useful start.
        </p>
      </LegalSection>

      <LegalSection heading="1. Put previously copied work on your shortlist">
        <p>
          If you have already found an unauthorised use of an artwork, you have a
          concrete reason to keep checking that piece. Keep the original and your
          record of the earlier incident together, so you can distinguish a
          familiar result from a newly discovered page.
        </p>
        <p>
          A previous incident does not prove that another will happen. It does
          mean this is a work you have already spent time investigating, and may
          want to keep in view.
        </p>
        <p>
          <strong className={STRONG}>Choose:</strong> one design with a
          documented copying or reposting problem, if you have one. If you do
          not, move on to the work that matters most to your business.
        </p>
      </LegalSection>

      <LegalSection heading="2. Include a piece that matters to your income">
        <p>
          Look at your own sales or licensing history. Which artwork supports a
          product you sell regularly? Which illustration appears in a collection
          you intend to keep offering?
        </p>
        <p>
          A bestseller is worth considering because of its importance to you.
          Sales alone do not tell you whether anyone has copied it. Use a
          specific piece rather than a whole category. &ldquo;The botanical print
          that sells every month&rdquo; is a more actionable choice than
          &ldquo;all my botanical work&rdquo;.
        </p>
        <p>
          <strong className={STRONG}>Choose:</strong> one consistently selling or
          otherwise commercially important artwork.
        </p>
        <BlogFlow
          title="Build your first monitoring shortlist"
          steps={[
            {
              title: "A known concern",
              text: "An artwork with a previous copying problem, if applicable.",
            },
            {
              title: "A business priority",
              text: "A bestseller or a work that matters to your income.",
            },
            {
              title: "A current focus",
              text: "A new release, promoted piece or licensed artwork.",
            },
          ]}
          ending="Choose your first pieces → Set a monitoring schedule → Review new findings"
          caption="A suggested selection order, not a measured risk score. One artwork may fit several categories; select it once."
        />
      </LegalSection>

      <LegalSection heading="3. Add a work you are actively promoting">
        <p>
          A launch gives you a natural moment to begin monitoring. You already
          know which pieces you are publishing, where your official listings are,
          and which partners are authorised to share them.
        </p>
        <p>
          Choose a lead illustration from the collection or the work featured in
          your campaign. Keep a note of your own shop pages and approved uses so
          they are easier to recognise when reviewing results. This does not mean
          a new release is automatically at greater risk. It makes monitoring
          part of an existing publishing routine, rather than a task you have to
          remember later.
        </p>
        <p>
          <strong className={STRONG}>Choose:</strong> one current release you want
          to keep watching after launch week.
        </p>
      </LegalSection>

      <LegalSection heading="4. Consider licensed work when context matters">
        <p>
          If you license your art, a match may be completely expected. An
          authorised partner might use the image on a product page, in a
          catalogue, or in promotional material.
        </p>
        <p>
          Before adding that work to your shortlist, keep a simple reference of
          the partners and uses you have authorised. Monitoring can give you
          pages to review; your records provide the context for deciding whether
          anything needs attention. A visual match cannot interpret a licence
          agreement for you. If you are unsure about a particular use, check the
          relevant agreement before drawing a conclusion.
        </p>
      </LegalSection>

      <LegalSection heading="What if you can only choose a few?">
        <p>
          Choose distinct artworks with clear reasons to monitor them. You do not
          have to fill every category, and a piece that fits two categories only
          needs to appear once.
        </p>
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <strong className={STRONG}>
            Illustrative example, not a customer case study.
          </strong>{" "}
          Imagine an artist with 60 illustrations: a bird print that sells
          regularly, a floral design previously found in an unauthorised listing,
          and a new landscape collection. A manageable starting list would be the
          floral design, the bird print and the lead landscape illustration. The
          other 57 pieces are not being judged safe or unimportant. The artist is
          simply starting with three clear priorities.
        </p>
        <p>
          If you have no sales history or previous copying incidents, choose the
          work you are currently showing to potential customers. The aim is a
          useful first step, not a complicated scoring system.
        </p>
      </LegalSection>

      <LegalSection heading="Turn your shortlist into a routine">
        <p>
          Once you have chosen your pieces, add them to TraceMyAssets and select
          an available automatic scan schedule. When a scheduled scan finds
          something new, TraceMyAssets emails you a count and a link to review
          the results. For each work, keep a short note of:
        </p>
        <LegalList
          items={[
            "Why you selected it.",
            "Where you publish or sell it yourself.",
            "Any partners or uses you have authorised.",
          ]}
        />
        <p>
          Those notes help you review findings without starting from scratch each
          time. You can compare possible matches with your original and decide
          which ones need a closer look.
        </p>
        <p>
          TraceMyAssets searches public, indexed pages through its search
          sources. It cannot see every page or guarantee that every copy will be
          found. A match is a lead to review, not proof of unauthorised use. See{" "}
          <Link href="/#sources" className={LINK}>
            where we look
          </Link>{" "}
          for the scope of the searches.
        </p>
      </LegalSection>

      <LegalSection heading="Revisit the list when your business changes">
        <p>
          A new collection, a licensing deal or a newly discovered copying
          problem can change your priorities. Use those moments to review what
          you monitor and decide whether to add more work. Older pieces can still
          matter. Avoid dropping a long-running seller simply because it is no
          longer your newest release.
        </p>
        <p>
          When a result needs attention, our guide to{" "}
          <Link
            href="/guides/what-to-do-when-you-find-a-copy-of-your-artwork"
            className={LINK}
          >
            what to do when you find a copy of your artwork
          </Link>{" "}
          can help you organise the next steps. If you need to organise your
          creation records, see{" "}
          <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
            how to document that you made your artwork
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
