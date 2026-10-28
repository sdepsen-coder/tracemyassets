import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

/**
 * General information, not legal advice. The only numbers are the ones in
 * docs/test-results.md (three synthetic images, one watermark strength), which
 * the guide states. It makes no claims about other watermarking tools or about
 * how often watermarks deter theft, because nothing we read measures that.
 */
export function VisibleVsInvisibleGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        Artists are told to watermark their work, but a visible mark and an
        invisible one do different jobs. This guide explains each job, what each
        mark cannot do, and a simple way to choose for the images you post.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. Our own measurements are from a
        small test and are listed on a separate page; we do not claim that any
        watermark stops theft.
      </p>

      <LegalSection heading="The two jobs">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>A visible mark</strong> (your name or
              signature on the picture) is read by people. It tells a viewer whose
              work it is and makes a copy look less usable. Its weakness is that
              it can be cropped out, covered or retouched, and a heavy mark
              spoils the image you want people to enjoy.
            </>,
            <>
              <strong className={STRONG}>An invisible mark</strong> is read by
              software. It leaves the picture looking the same and can carry an
              identifier. Its weakness is that edits can destroy it. Nothing about
              it is visible to a person, so it does not deter anyone by itself.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="What our invisible mark survives, and what it does not">
        <p>
          In our tests (three synthetic images, one watermark strength) the mark
          stayed readable after lossless saving, JPEG at quality 85 and above,
          WEBP at 90, black and white, and contrast, hue and sepia changes. It
          was lost after any resize, any crop, rotation, mirroring, a brightness
          change, stronger compression and a screenshot-like copy. Real artwork
          may behave differently. The full table is in{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>
          .
        </p>
        <p>
          That matters because most copies on marketplaces are resized or
          cropped for a product. For those, the invisible mark is usually gone, so
          we do not rely on it: finding the copy is done by comparing how the
          images look, which recognised resized, recompressed, recoloured and
          cropped copies in our tests, and only part of the time the smallest and
          most heavily cropped ones.
        </p>
      </LegalSection>

      <LegalSection heading="How to choose">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>Images you want people to see and share
              (social posts, portfolio):</strong> a small visible signature in a
              corner you would not want to lose, or your name in the file name and
              caption. Keep the image at a moderate size.
            </>,
            <>
              <strong className={STRONG}>The original, high-resolution file:</strong>{" "}
              keep it private. Share it only with buyers or print partners you
              trust. An invisible mark on that file helps you check later whether
              an unedited copy came from it.
            </>,
            <>
              <strong className={STRONG}>Proof of authorship:</strong> neither mark
              proves you made the work. Your working files, dated posts and
              history do. See{" "}
              <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
                how to prove you made your artwork
              </Link>
              .
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="What neither mark does">
        <LegalList
          items={[
            "It does not stop someone saving, copying or reselling your image.",
            "It does not stop AI training.",
            "It does not remove a copy for you. You still have to find it and report it.",
          ]}
        />
        <p>
          More on AI in{" "}
          <Link href="/guides/can-you-stop-ai-from-training-on-your-artwork" className={LINK}>
            can you stop AI from training on your artwork
          </Link>
          , and on finding copies in{" "}
          <Link href="/blog/three-ways-to-find-copies-of-your-artwork" className={LINK}>
            three ways to find copies of your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Where TraceMyAssets fits">
        <p>
          You register an artwork, we embed the invisible mark in the protected
          copy you download, and we check public web pages on a schedule for
          possible matches. We only see pages a search engine has indexed, a match
          is a possible match and never proof, and you decide what to do. We do
          not contact anyone for you. See the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
