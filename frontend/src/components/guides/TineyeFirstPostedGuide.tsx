import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * How-to based on TinEye's own help page (checked 2026-10-27): ways to search,
 * the sort options and the stated limits. Menu names may change, so the guide
 * says to look for them rather than promising exact screens. No claim about
 * how many copies TinEye finds.
 */
export function TineyeFirstPostedGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        When you find a copy of your work, one of the first questions is: who
        posted it first? TinEye can help you answer it. This guide shows how to
        search, how to sort the results to see the earliest known copy, and what
        the answer does and does not prove.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. TinEye changes its pages from time
        to time, so look for the options named here rather than expecting the
        exact same screen.
      </p>

      <LegalSection heading="Step 1: search with your image">
        <p>TinEye lets you start a search in several ways:</p>
        <LegalList
          items={[
            "Upload a file with the upload button on its search page, or drop a file onto the page.",
            "Paste an image address (a URL) into the search box.",
            "Copy an image or its link, then paste it into the search box.",
            "Install a TinEye browser extension, right-click an image on any page and choose to search it on TinEye.",
          ]}
        />
        <p>
          TinEye says it does not save the images you search with or add them to
          its index.
        </p>
      </LegalSection>

      <LegalSection heading="Step 2: sort by oldest">
        <p>
          Results come with sort options: best match (the default), most changed,
          biggest image, newest and oldest. Choose <strong className="text-[var(--text)]">oldest</strong>{" "}
          to see the earliest instance TinEye knows about. Other useful options:
        </p>
        <LegalList
          items={[
            "Most changed shows copies that have been edited the most, such as recoloured or cropped versions.",
            "Biggest image shows the highest-resolution copies, which is often where a clean download came from.",
            "A filter by website lets you check one shop or site.",
            "Clicking a result lets you flip between your image and the match to compare them.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Step 3: read the dates carefully">
        <p>
          &ldquo;Oldest&rdquo; means the oldest copy <em>TinEye found</em>, not
          the oldest copy that exists. If your own post is in the list and is the
          earliest, that is a helpful record. If a copy appears to be earlier
          than yours, do not panic: your image may have been posted elsewhere
          first, or the date may only show when TinEye first saw it.
        </p>
        <p>
          Take a screenshot of the results page with the date, and note the
          addresses. This is a record of what you saw, not proof of who made the
          work. For that, your working files and first-publication link matter
          more; see{" "}
          <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
            how to prove you made your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What a TinEye search cannot tell you">
        <LegalList
          items={[
            "TinEye says it does not index social media sites such as Facebook or LinkedIn, so copies posted there will not show up.",
            "No results means the image is not in TinEye's index. It does not mean the image is not online.",
            "TinEye cannot say whether a use is allowed. Only you, as the owner, know whether you gave permission or licensed the work.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Use it together with other tools">
        <p>
          Every search tool has its own collection of the web. Repeat the search
          with Google Lens or Bing visual search, with a cropped detail and with a
          smaller version of your image.{" "}
          <Link href="/guides/how-to-check-if-your-artwork-was-reposted" className={LINK}>
            The step-by-step guide
          </Link>{" "}
          shows how, and{" "}
          <Link
            href="/guides/what-to-do-when-you-find-a-copy-of-your-artwork"
            className={LINK}
          >
            what to do when you find a copy
          </Link>{" "}
          gives the next steps.
        </p>
        <p>
          To stop doing this by hand, TraceMyAssets checks the artworks you
          register on a schedule and shows possible matches for you to review. We
          only see public pages that a search engine indexes, and a match is a
          possible match, never proof. See the{" "}
          <Link href="/pricing" className={LINK}>
            plans
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className="text-[var(--text)]">Is TinEye free?</strong> TinEye
          offers searches on its website. Check its current page for limits and
          any paid options.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            Does the oldest result prove I posted first?
          </strong>{" "}
          No. It shows the earliest copy that TinEye found. Keep your own dated
          records as well.
        </p>
      </LegalSection>
    </>
  );
}
