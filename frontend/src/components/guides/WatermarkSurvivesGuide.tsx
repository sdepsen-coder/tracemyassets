import Link from "next/link";

import { WatermarkSurvival } from "@/components/diagrams/WatermarkSurvival";
import {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * Every number and result here comes from docs/test-results.md (Tables 1 and
 * 2). If a result changes there, change this page in the same commit.
 */
export function WatermarkSurvivesGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        An invisible watermark hides a small code inside an image. If a copy of
        that image turns up somewhere else, the code can be read back and tied
        to your protected file. The catch is that the code is fragile. This
        page lists what we measured: which edits keep it readable and which
        remove it.
      </p>

      <LegalSection heading="What an invisible watermark is">
        <p>
          Nothing visible is added to the picture. The mark is a signed code
          woven into the fine detail of the image. It can only be read from a
          file that still carries it, so it is strongest on the exact file you
          shared and weaker the more the file is changed.
        </p>
        <p>
          That also means the mark cannot stop anyone from copying an image.
          What it can do is help show where a copy came from, when it survives.
        </p>
      </LegalSection>

      <LegalSection heading="What survived and what did not">
        <p>
          We marked test images and then edited them. In every row below the
          result was the same on all three images. Green means the mark could
          still be read; red means it was lost.
        </p>
        <WatermarkSurvival />
        <p>In plain words:</p>
        <LegalList
          items={[
            "It survived saving as lossless PNG or WEBP, JPEG at quality 95 and 85, WEBP at quality 90, a contrast increase, black and white, a hue shift and a sepia tone.",
            "It did not survive JPEG at quality 70 or 50, WEBP at quality 75, any resize (smaller or larger), any crop, rotating, mirroring, a brightness change, or a screenshot-like copy (half size, then JPEG).",
          ]}
        />
      </LegalSection>

      <LegalSection heading="How we tested">
        <p>
          We generated three test images (random circles and rectangles,
          slightly blurred, 1000 by 1000 pixels), marked each with the same
          code that protects a real upload, saved them as PNG, edited them,
          and tried to read the mark back. The tests are part of our code and
          pin these results, so this page cannot drift from them without a
          failing test.
        </p>
      </LegalSection>

      <LegalSection heading="What this means in practice">
        <p>
          A copy can only carry the mark if it is still close to the file you
          shared. If it was resized, cropped, recompressed or screenshotted, our
          tests show the mark is gone. So the mark alone will miss every copy
          that has been changed that way.
        </p>
        <p>
          That is why every search result is also compared with your original
          by how it looks, which does not need the mark. On the same test
          images, that comparison flagged these edited copies on every image:
          resized to half, JPEG at quality 70, screenshot-like, brighter,
          cropped to the middle 60 percent, and hung in a framed room mockup
          (the artwork about 40 percent of the width). It flagged a copy at a
          quarter of the size, a 40 percent corner crop and a small mockup (about 25 percent of the width) only
          some of the time, and it never flagged an unrelated image. Only the
          unchanged, black and white, hue-shifted and sepia copies were
          identified by the mark itself; every other row was found by look.
        </p>
      </LegalSection>

      <LegalSection heading="What we have not tested">
        <LegalList
          items={[
            "Re-creating the image with an AI tool. It is a known way marks like this can be removed. We have not tested it, and we have not tested how well such re-created copies are recognised by look.",
            "Other editing programs, other quality settings, and combinations of edits.",
            "Real artwork. Our images were generated, and real paintings, photographs and illustrations differ in texture, flat areas, text and grain. Treat the results as a guide, not a guarantee.",
            "How often a search finds the page that shows a copy in the first place. These tests only measure what happens once an image is in hand.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="What to do with this">
        <LegalList
          items={[
            "Share the protected copy, never your original, and keep it as a lossless or high-quality file when you can.",
            "Do not rely on the mark alone. Expect it to be gone from resized, cropped or screenshotted copies.",
            "Look for copies by how they look as well. A match is a possible match, never proof: you review it and decide.",
          ]}
        />
        <p>
          More answers are on the{" "}
          <Link href="/help" className={LINK}>
            Help page
          </Link>
          , and the plans are on the{" "}
          <Link href="/pricing" className={LINK}>
            Pricing page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className="text-[var(--text)]">
            Does an invisible watermark stop people copying my art?
          </strong>{" "}
          No. It does not prevent copying. When it survives, it can help show
          where a copy came from.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Does a screenshot remove it?
          </strong>{" "}
          In our tests a screenshot-like copy (half size, then recompressed)
          lost the mark.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Is a readable mark proof that the work is mine?
          </strong>{" "}
          It links a file to the protected copy we made. It is a technical
          signal for you to review, not legal proof of ownership or copying.
        </p>
      </LegalSection>
    </>
  );
}
