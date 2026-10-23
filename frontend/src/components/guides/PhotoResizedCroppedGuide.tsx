import Link from "next/link";

import {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * Every result here comes from docs/test-results.md (Table 1 for the mark,
 * Table 2 for recognition by look). Only edits that were measured with the
 * same setting in both tables share a row; the rest are listed separately.
 * If a result changes there, change this page in the same commit.
 */
const SAME_EDIT_ROWS: { edit: string; mark: string; look: string }[] = [
  {
    edit: "Black and white",
    mark: "Readable",
    look: "Found by the mark",
  },
  {
    edit: "Hue shift",
    mark: "Readable",
    look: "Found by the mark",
  },
  {
    edit: "Sepia tone",
    mark: "Readable",
    look: "Found by the mark",
  },
  {
    edit: "JPEG quality 70",
    mark: "Lost",
    look: "Flagged on every image",
  },
  {
    edit: "Resized to 50%",
    mark: "Lost",
    look: "Flagged on every image",
  },
  {
    edit: "Screenshot-like (half size, then JPEG quality 80)",
    mark: "Lost",
    look: "Flagged on every image",
  },
  {
    edit: "Resized to 25%",
    mark: "Lost",
    look: "Flagged some of the time",
  },
];

export function PhotoResizedCroppedGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        A photograph that is shared can end up resized, cropped, recompressed
        or screenshotted. This page shows what our tests found happens to an
        invisible watermark in those cases, and how well a copy was still
        recognised by how it looks. The test images were generated paintings,
        not photographs, so read the results as a guide, not a promise.
      </p>

      <LegalSection heading="Resizing and cropping remove the mark">
        <p>
          In our tests, any resize (to 75%, 50% or 25%, or enlarged 2x) and any
          crop (to 90% or to 50%) removed the invisible watermark, and so did
          rotating, mirroring, a brightness change, JPEG at quality 70 or 50,
          and a screenshot-like copy. The mark survived lossless saving, JPEG
          at quality 85 or higher, WEBP at quality 90, a contrast increase,
          black and white, a hue shift and a sepia tone. The full list is in{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>
          .
        </p>
        <p>
          So a resized or cropped copy of a photograph will not carry the mark.
          Finding such a copy depends on how it looks.
        </p>
      </LegalSection>

      <LegalSection heading="The same edits, checked by look">
        <p>
          For the edits we measured with the same setting both ways, this is
          what happened. &ldquo;Mark&rdquo; says whether the invisible mark
          could still be read. &ldquo;By look&rdquo; says whether the
          comparison flagged the copy for you to review (&ldquo;found by the
          mark&rdquo; means the mark itself identified it).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px] sm:text-[14px]">
            <caption className="sr-only">
              The same edits: whether the invisible mark survived and whether
              the copy was recognised by how it looks, measured on generated
              test images.
            </caption>
            <thead>
              <tr className="text-[12px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Edit
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  Mark
                </th>
                <th scope="col" className="px-2 py-2 font-medium">
                  By look
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {SAME_EDIT_ROWS.map((row) => (
                <tr key={row.edit} className="align-top">
                  <th scope="row" className="py-2.5 pr-3 font-normal text-[var(--text)]">
                    {row.edit}
                  </th>
                  <td className="px-2 py-2.5 text-[var(--text)]">{row.mark}</td>
                  <td className="px-2 py-2.5 text-[var(--text)]">{row.look}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection heading="Other edits, measured by look only">
        <LegalList
          items={[
            "Cropped to the middle 60 percent: flagged on every test image.",
            "A 40 percent corner crop: flagged only some of the time.",
            "Brighter (plus 40 percent): flagged on every test image.",
            "Framed and hung in a room mockup, the artwork about 40 percent of the width: flagged on every test image. In a small mockup (about 25 percent of the width): only some of the time.",
            "Unrelated images were never flagged.",
          ]}
        />
        <p>
          Expect to miss very small copies, a small corner of the picture and
          small mockups some of the time.
        </p>
      </LegalSection>

      <LegalSection heading="What we have not tested">
        <LegalList
          items={[
            "Real photographs. Photographs differ from our generated images in texture, grain and flat areas.",
            "Re-creating the image with an AI tool, other editing programs, other quality settings and combinations of edits.",
            "How often a search finds the page that shows a copy in the first place. These tests only measure what happens once an image is in hand.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What this means for a photographer">
        <LegalList
          items={[
            "Share the protected copy, never your original, and keep your original private.",
            "Do not count on the mark to find a copy that was resized or cropped.",
            "Check copies by how they look as well, and treat every match as a possible match you review yourself.",
          ]}
        />
        <p>
          More on{" "}
          <Link href="/for/photographers" className={LINK}>
            using TraceMyAssets as a photographer
          </Link>
          ,{" "}
          <Link href="/guides/how-to-check-if-your-artwork-was-reposted" className={LINK}>
            how to check whether your work was reposted
          </Link>
          , and the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className="text-[var(--text)]">
            Does cropping a photo remove the invisible watermark?
          </strong>{" "}
          In our tests, yes: every crop we tried removed it.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Can a cropped copy still be found?
          </strong>{" "}
          Sometimes. A crop to the middle 60 percent was flagged on every test
          image; a small corner crop only some of the time.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Do these results apply to my photos?
          </strong>{" "}
          Not necessarily. We tested generated images, not photographs.
        </p>
      </LegalSection>
    </>
  );
}
