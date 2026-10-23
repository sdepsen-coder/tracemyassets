import Link from "next/link";

import {
  LegalList,
  LegalSection,
} from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * General how-to. It names no steps that depend on a tool's current screens,
 * makes no claim about how many copies any tool finds, and ends with what the
 * product does, in the same words as the rest of the site.
 */
export function CheckIfRepostedGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You can make a useful first check by hand, for free, in about fifteen
        minutes. This guide shows how, what to look for in what you find, what
        to write down, and what a search that finds nothing does and does not
        tell you.
      </p>

      <LegalSection heading="Before you start">
        <LegalList
          items={[
            "Have your original file and a web-sized copy of it ready.",
            "Write down where and when you first published the work (your shop, portfolio or post, with the date). Dates help later if you have to show that it was yours first.",
            "Note the words you used: the title, the tags, your shop or artist name, and any caption.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Step 1: search by image with more than one tool">
        <p>
          Reverse image search tools such as Google Lens, Bing visual search
          and TinEye take a picture and look for pages that show it. Each one
          uses its own collection of the web, so they return different pages.
          Use at least two, and repeat the search in these ways:
        </p>
        <LegalList
          items={[
            "With the whole image.",
            "With a smaller version of it, in case the copy online is a reduced one.",
            "With a cropped detail (a face, a corner, a distinctive shape), in case the copy was cropped.",
          ]}
        />
        <p>
          None of these tools promises to find every copy. A page that was
          never indexed, or that is not public, cannot be found by any of them.
        </p>
      </LegalSection>

      <LegalSection heading="Step 2: search by words">
        <p>
          Some copies are easier to find by their text than by their image.
          Search for the exact title, a distinctive phrase from your caption,
          and your artist or shop name together with words like &ldquo;print&rdquo;,
          &ldquo;poster&rdquo; or &ldquo;download&rdquo;. If you sell on a
          marketplace, also search that marketplace for your title and tags.
        </p>
      </LegalSection>

      <LegalSection heading="Step 3: decide what you are looking at">
        <p>Not every match is a problem. For each page, ask:</p>
        <LegalList
          items={[
            "Is it really your work, or only something similar?",
            "Is it your own listing, a licensed use, or a repost that credits you and that you are happy with?",
            "Is someone selling it, or is it shown on a personal page or a social post?",
            "When did it appear compared with your first publication?",
          ]}
        />
        <p>
          A match is a possible match, never proof. You review it and decide
          what, if anything, to do.
        </p>
      </LegalSection>

      <LegalSection heading="Step 4: keep a record before you act">
        <LegalList
          items={[
            "The page address.",
            "A screenshot that shows the page, the address and the date.",
            "Your original file and the date you first published it.",
            "A short note of what you found and when.",
          ]}
        />
        <p>
          Do not contact anyone yet. First decide what you want, and look up
          how the site or marketplace handles reports of unlicensed use: each
          one has its own process.
        </p>
      </LegalSection>

      <LegalSection heading="What a search that finds nothing means">
        <p>
          It is encouraging, but it is not proof that no copy exists. Search
          tools only see public web pages that a search engine has indexed.
          Private groups, closed apps and some social networks are out of
          reach, and an edited or heavily cropped copy may not be matched to
          your image. Repeat the check from time to time, because the web
          changes.
        </p>
      </LegalSection>

      <LegalSection heading="Doing this on a schedule">
        <p>
          The manual check works, but it has to be repeated by hand. TraceMyAssets
          runs the search for you on a schedule you choose, using two different
          sources, compares each result with your original by how it looks and
          by your invisible watermark, and emails you a count and a link when a
          scheduled scan finds something new. You see both images side by
          side and decide what to do; we never contact anyone for you. It has
          the same limits as above: public, indexed pages only, and a match is
          a possible match.
        </p>
        <p>
          Read what the invisible watermark can and cannot do in{" "}
          <Link href="/guides/what-an-invisible-watermark-survives" className={LINK}>
            what an invisible watermark survives
          </Link>
          , and see the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className="text-[var(--text)]">Is a reverse image search free?</strong>{" "}
          Each tool has its own terms, limits and prices, and they change, so
          check them when you use one.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Will it always find my copies?
          </strong>{" "}
          No. It finds pages that are public and indexed, and it can miss
          changed or cropped copies.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Does a match mean someone copied my work without permission?
          </strong>{" "}
          Not by itself. It is a lead for you to review, not legal proof.
        </p>
      </LegalSection>
    </>
  );
}
