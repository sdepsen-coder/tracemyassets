import Link from "next/link";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";

/**
 * General information, not legal advice. The notice elements come from
 * 17 U.S.C. 512(c)(3). It makes no claim about what any one platform accepts
 * as proof and does not say registration is required to send a DMCA notice.
 */
export function ProveAuthorshipGuide() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        When you report a copy of your work, the platform may ask you to show
        that it is yours. The best time to prepare is before anything goes wrong.
        None of this is complicated, and most of it is habit.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice. Copyright rules vary by country.
      </p>

      <LegalSection heading="1. Keep your working files">
        <p>
          A flattened JPEG can be made by anyone who downloads your post. A
          layered file, sketches, a brush-stroke timelapse or a folder of
          progressive versions is hard to fake. Back them up somewhere with
          reliable dates; cloud storage with version history works well.
        </p>
      </LegalSection>

      <LegalSection heading="2. Publish first, with a date">
        <p>
          A dated public post on your portfolio or social account is a simple,
          credible record of first publication. Keep the link. When a platform
          asks for a link to the work and the date of first publication, this is
          what you point to.
        </p>
      </LegalSection>

      <LegalSection heading="3. Add metadata and visible credit">
        <p>
          Embed your name and a copyright notice in the file metadata, and keep
          your signature or a subtle watermark where it does not spoil the piece.
          Neither is bulletproof, and metadata is often stripped when a platform
          re-saves an image, but both make casual copying easier to spot and
          harder to excuse.
        </p>
      </LegalSection>

      <LegalSection heading="4. Consider registration">
        <p>
          In the US, registering your copyright is generally required before you
          can file an infringement lawsuit, and it can affect what damages are
          available. It is not needed to send a DMCA notice. If you sell prints
          or license work, check the registration options in your own country.
        </p>
      </LegalSection>

      <LegalSection heading="5. Keep an evidence folder per piece">
        <p>
          For each work keep the final file, the source files, the
          first-publication link, and a short log of any copy you find: URLs,
          screenshots, dates and notices sent. It turns a stressful discovery
          into a short task.
        </p>
      </LegalSection>

      <LegalSection heading="What a takedown needs from you">
        <p>
          A valid DMCA notice includes identification of your work, the URLs of
          the copies, your contact details, a good-faith statement, and a
          statement under penalty of perjury that your information is accurate
          and that you are authorised to act (17 U.S.C. 512(c)(3)). The US
          Copyright Office&apos;s DMCA page lists the designated agents that
          platforms register. With your evidence folder ready you can fill these
          in quickly and honestly.
        </p>
      </LegalSection>

      <LegalSection heading="Then look for copies">
        <p>
          Evidence is only useful once you know a copy exists. A reverse image
          search (Google Lens, TinEye) is a good manual start. If you would
          rather not check by hand, TraceMyAssets looks for possible copies of
          the artworks you register and can repeat the scan on a schedule. A
          match is a possible match, never proof, and we only see public pages
          that a search engine indexes. You decide what to do with it.
        </p>
        <p>
          See{" "}
          <Link href="/guides/how-to-check-if-your-artwork-was-reposted" className={LINK}>
            how to check whether your artwork was reposted
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          <strong className="text-[var(--text)]">
            Do I have to register my copyright to file a takedown?
          </strong>{" "}
          A DMCA takedown does not require registration. It requires that you own
          the work or are authorised to act for the owner. Registration matters
          more if you later want to sue, and the rules differ by country.
        </p>
        <p>
          <strong className="text-[var(--text)]">
            What is the best single piece of evidence?
          </strong>{" "}
          Your layered or working source file with its timestamps, ideally backed
          by a dated public first post.
        </p>
      </LegalSection>
    </>
  );
}
