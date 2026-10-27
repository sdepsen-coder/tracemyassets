import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * Longer piece, written only from what docs/test-results.md measures and what
 * the code does. Limits of those tests (three synthetic images, one watermark
 * strength) are stated in the text. No catch rate per scan type is claimed:
 * that is not measured. Nothing is said about how Google Lens, TinEye or any
 * other service works inside.
 */
export function ThreeWaysToFindCopiesPost() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        When people ask how to find copies of their artwork online, they usually
        get one answer: &ldquo;do a reverse image search.&rdquo; It is good
        advice and it is only a third of the picture. There are three different
        ways to find a copy, they fail in different places, and knowing where
        each one fails matters more than picking a favourite.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        This is written by the people who build TraceMyAssets, so read it with
        that in mind. The numbers below come from our own tests, which we
        describe, with their limits, in the last section.
      </p>

      <LegalSection heading="The three ways, in one table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text)]">
                <th className="py-2 pr-4 font-medium">Way</th>
                <th className="py-2 pr-4 font-medium">Good at</th>
                <th className="py-2 font-medium">Misses</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4">Reverse image search by hand</td>
                <td className="py-3 pr-4">
                  Free, flexible, you see results immediately
                </td>
                <td className="py-3">
                  Anything you do not check today; pages the search tool never
                  indexed
                </td>
              </tr>
              <tr className="border-b border-[var(--border)]">
                <td className="py-3 pr-4">An invisible watermark</td>
                <td className="py-3 pr-4">
                  Linking a file you hold back to your account, when it survives
                </td>
                <td className="py-3">
                  Most edits: it does not survive resizing, cropping or strong
                  compression
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Scheduled monitoring</td>
                <td className="py-3 pr-4">
                  Checking again and again so you do not have to remember
                </td>
                <td className="py-3">
                  The same blind spots as the search it runs on: private pages
                  and closed apps
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection heading="1. Reverse image search by hand">
        <p>
          You upload your image to a tool such as Google Lens or TinEye, or paste
          its address, and look at the pages that come back. It costs nothing, you
          can try variations (a crop, a different tool), and you judge every
          result with your own eyes. For a one-off question like &ldquo;is this
          listing using my picture?&rdquo; nothing beats it.
        </p>
        <p>
          Its weakness is not the search, it is the habit. A search tells you what
          was findable at the moment you ran it. Copies appear later, on other
          sites, under new listings. Unless you repeat the search on a schedule,
          you find out about a copy the day you happen to look, which is often
          the day someone sends you a screenshot.
        </p>
        <p>
          The second limit is coverage. A search tool can only show pages it has
          seen. A page behind a login, inside a private group or in a closed app
          will not appear, however good the tool is.{" "}
          <Link href="/guides/how-to-check-if-your-artwork-was-reposted" className={LINK}>
            Our step-by-step guide
          </Link>{" "}
          shows how to do this properly and keep a record.
        </p>
      </LegalSection>

      <LegalSection heading="2. An invisible watermark">
        <p>
          An invisible watermark hides a small code in the pixels of the image.
          If the code can be read back from a file, it points to the artwork and
          account that produced it. That is a strong kind of evidence, because it
          does not depend on how the picture looks.
        </p>
        <p>
          The catch is how fragile it is. We tested our own mark on three
          synthetic test images. It survived saving as PNG, JPEG at quality 85 and
          above, and WEBP at quality 90, and it survived a black-and-white
          conversion, a contrast change, a hue shift and a sepia tone. It did not
          survive any resize (75%, 50%, 25% or enlarging), any crop (even 90%),
          rotation, mirroring, a brightness change, stronger JPEG or WEBP
          compression, or a screenshot-like copy.
        </p>
        <p>
          In plain words: a copy that someone has resized or cropped, which is
          what most reposting does, has usually lost the mark. A watermark is a
          useful extra signal when it is still there. It is a poor way to
          discover copies, and it is a poor thing to build a whole strategy on.
          See{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>{" "}
          for the full list.
        </p>
      </LegalSection>

      <LegalSection heading="3. Scheduled monitoring">
        <p>
          Monitoring is the first way, done again and again for you. The
          artwork is searched on a schedule and you are told if something new
          turns up. In TraceMyAssets the schedule is weekly or monthly on the
          free plan and can be daily on the paid plans. After a scheduled scan we
          send an email with a count and a link, and nothing else, so the email
          itself does not show your work.
        </p>
        <p>
          What monitoring adds is time. A copy that appears on a Tuesday is seen
          on Wednesday instead of in three months. What it does not add is reach:
          it can only look where the underlying search can look. Our Standard scan
          uses Google Cloud Vision web detection, and the Deep scan asks Google
          Lens for matches. Whether a page is listed at all depends on what those
          services have indexed. We have not measured a catch rate for either, and
          you should be wary of anyone who quotes one without showing how they
          measured it.
        </p>
      </LegalSection>

      <LegalSection heading="Finding a candidate is only half the job">
        <p>
          A search result is a candidate, not a verdict. The next question is
          whether the picture on that page really is yours, even after it has been
          edited. This step is separate from finding it, and we tested it
          separately.
        </p>
        <p>
          Our comparison looks at how the image looks (a perceptual hash and
          matching keypoints), not only at the watermark. On the three test
          images it recognised copies resized to 50%, recompressed, screenshot-like,
          recoloured, brightened, cropped to the middle 60% and placed in a room
          mockup, every time, including the cases where the watermark had already
          been destroyed. It recognised very small copies (25%), a 40% corner
          crop and small mockups only part of the time, so some of those will be
          missed. Unrelated images were never flagged.
        </p>
        <p>
          This is why we treat the watermark as one extra signal rather than the
          main one, and why every result is shown as a possible match for you to
          review, never as proof.
        </p>
      </LegalSection>

      <LegalSection heading="How to combine them without false confidence">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>Use search by hand for questions.</strong>{" "}
              Something looks familiar, a customer sends a link: search by image
              with more than one tool and read the pages yourself.
            </>,
            <>
              <strong className={STRONG}>Use monitoring for time.</strong> It
              will not find everything, but it finds new copies sooner than
              remembering to look.
            </>,
            <>
              <strong className={STRONG}>Treat the watermark as a bonus.</strong>{" "}
              If a copy still carries it, that is strong evidence. If it does not,
              that tells you nothing about whether the copy exists.
            </>,
            <>
              <strong className={STRONG}>Keep your own evidence.</strong> Working
              files and a dated first publication matter more than any tool&apos;s
              output when you report a copy. See{" "}
              <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
                how to prove you made your artwork
              </Link>
              .
            </>,
            <>
              <strong className={STRONG}>Decide yourself what to do next.</strong>{" "}
              Start with the gentlest step.{" "}
              <Link
                href="/guides/what-to-do-when-you-find-a-copy-of-your-artwork"
                className={LINK}
              >
                What to do when you find a copy
              </Link>{" "}
              gives a calm order.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="What our tests do and do not show">
        <p>
          We write this down because a blog post is where a company is most
          tempted to round numbers up.
        </p>
        <LegalList
          items={[
            "The test images are synthetic (random shapes, 1000 by 1000 pixels), three of them, not real paintings, photographs or illustrations. Real work has texture, flat areas, text and grain that behave differently.",
            "We tested one watermark strength, the current one. Other editing tools, quality settings and combinations of edits are unknown.",
            "The comparison test measures what happens once a candidate image is in hand. It does not measure whether a search service lists the page in the first place, so none of it is a catch rate for the Standard or Deep scan.",
            "A match is a technical signal for you to review. It is not proof of copying or of ownership.",
          ]}
        />
        <p>
          If you want to see the same results as short tables, read{" "}
          <Link
            href="/guides/what-happens-to-a-photo-when-it-is-resized-or-cropped"
            className={LINK}
          >
            what happens to a photo when it is resized or cropped
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
