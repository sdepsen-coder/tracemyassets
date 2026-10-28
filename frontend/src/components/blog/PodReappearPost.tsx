import Link from "next/link";
import type { ReactNode } from "react";

import { LegalList, LegalSection } from "@/components/legal/LegalPage";

const LINK = "text-[var(--primary)] underline";
const STRONG = "text-[var(--text)]";

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className={LINK} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/**
 * Researched piece (checked 2026-10-28). Sources read: Waxy.org on automated
 * t-shirt stores that list art taken from social media (Dec 2019); Print &
 * Promo Marketing on Teespring (18 Jul 2018) and on Merch by Amazon (29 Sep
 * 2021); Etsy's IP policy page; Redbubble's help page on restricted accounts.
 * Two of the three press pieces are several years old and the post says so.
 * It gives no figures on how often copies return, because none of the sources
 * measured that, and it claims nothing about how any platform works today
 * beyond what its own current page states.
 */
export function PodReappearPost() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You report a listing, it comes down, and a week later the same drawing is
        on sale again, from another shop or another site. Artists describe this
        often, and it is not bad luck. It follows from how print-on-demand
        selling is set up. This piece explains the mechanics, what the
        platforms say about repeat sellers, and what a realistic routine looks
        like when you cannot stop the copies but can keep up with them.
      </p>
      <p className="text-[13px] text-[var(--text-muted)]">
        General information, not legal advice, checked on 28 October 2026. Most
        of the reporting we cite is from 2018 to 2021 and platforms change their
        systems, so read it as how the problem works, not as a count of how
        often it happens today. We found no study that measures how often
        removed copies return.
      </p>

      <LegalSection heading="The short version">
        <LegalList
          items={[
            "A print-on-demand listing costs a seller almost nothing to create and nothing to keep in stock, so removing one listing barely hurts them.",
            "Reports remove the listing, not the person's ability to open another. Platforms say they act against repeat infringers, but they do not publish how many notices that takes.",
            "The same image can be on several sites at once. A removal on one does not touch the others.",
            "So the useful question is not how to remove a copy for good, but how soon you see the next one.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Why a removal does not end it">
        <p>
          On a print-on-demand site the seller holds no stock. A product is made
          only when someone buys it, so a shop can carry a very large number of
          listings at no cost. Some platforms also push listings to other
          marketplaces. That is the point of the model, and it is also why a
          single removal has little effect on someone who has hundreds of listings
          up.
        </p>
        <p>
          Artists report the same pattern in the press. In 2018 an illustrator
          told Print &amp; Promo Marketing that after he reported his work to
          Teespring and it removed the apparel, similar designs kept appearing,
          which he called a &ldquo;hamster wheel&rdquo;.{" "}
          <Ext href="https://printandpromomarketing.com/article/teespring-has-a-stolen-designs-problem/">
            Print &amp; Promo Marketing, 18 July 2018
          </Ext>
          . The same article reports artists suspecting that sellers copy
          designs from a site where the originals sell well; that is their
          suspicion, not something the article proved.
        </p>
      </LegalSection>

      <LegalSection heading="Some of it is automated">
        <p>
          A 2019 report on Waxy.org described stores that appeared to watch
          Twitter for phrases like &ldquo;I want this on a shirt&rdquo;, take the
          artwork from the post, and create a listing with no person involved. In
          the author&apos;s test, a listing appeared within hours of the request.
          The author says the bots tracked text, not images, which is how a
          counter-trick worked. Similar listings turned up on other sites, and the
          spam continued.{" "}
          <Ext href="https://waxy.org/2019/12/how-artists-on-twitter-tricked-spammy-t-shirt-stores-into-admitting-their-automated-art-theft/">
            Waxy.org, December 2019
          </Ext>
          . The article describes allegations and one test, not a measured
          rate.
        </p>
        <p>
          When listings are made by a script, it is no surprise that a removal
          does not stop the next one: nobody decided to take your work, a program
          did, and it keeps running.
        </p>
      </LegalSection>

      <LegalSection heading="The same design can move between marketplaces">
        <p>
          In 2021 a seller told Print &amp; Promo Marketing that he uploaded one
          design to Etsy through his printing partner and found it, weeks later,
          on Merch by Amazon, where scammers had sold about 20 shirts with it.
          Sellers said the copied art was often lifted from the product mockup
          rather than the original upload. Amazon told the publication it uses
          vetting and moderation, removes items quickly when it finds or is
          alerted to infringement, and pursues legal action where appropriate; the
          article notes that the sheer volume of products makes catching every
          listing hard.{" "}
          <Ext href="https://printandpromomarketing.com/?p=128330">
            Print &amp; Promo Marketing, 29 September 2021
          </Ext>
          .
        </p>
        <p>
          The practical point: your picture on a mockup, a social post or a
          storefront is a copy-ready file. Anyone, or any script, can take it from
          there.
        </p>
      </LegalSection>

      <LegalSection heading="What the platforms say about repeat sellers">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>Etsy:</strong> terminates selling
              privileges for members with repeat or multiple notices &ldquo;in
              appropriate circumstances and at Etsy&apos;s discretion&rdquo;, and may
              refuse service to a terminated member who opens a new shop and to
              accounts it believes are associated. The page does not say how many
              notices trigger this.{" "}
              <Ext href="https://etsy.com/legal/ip/">Etsy&apos;s IP policy</Ext>.
            </>,
            <>
              <strong className={STRONG}>Redbubble:</strong> restricts accounts
              that attract repeated infringement claims. A restricted account
              cannot sell, and Redbubble says it will not tell the seller which
              works are the problem. It also says new accounts can be briefly
              restricted for up to five business days, which is a setup
              restriction, not necessarily a sign of infringement.{" "}
              <Ext href="https://help.redbubble.com/hc/en-us/articles/360051811312">
                Redbubble help
              </Ext>
              .
            </>,
            <>
              <strong className={STRONG}>Temu:</strong> says it terminates repeat
              infringers in appropriate circumstances, without defining them. See
              our{" "}
              <Link href="/guides/how-to-report-your-artwork-on-temu" className={LINK}>
                Temu guide
              </Link>
              .
            </>,
          ]}
        />
        <p>
          None of these pages gives a number, a timeline or a way for you to see
          whether a seller has been flagged before. Reporting still matters: it is
          the step that creates the record those policies depend on. But it is a
          record on the platform&apos;s side that you cannot see.
        </p>
      </LegalSection>

      <LegalSection heading="What this means for how you work">
        <LegalList
          items={[
            <>
              <strong className={STRONG}>Expect to report more than once.</strong>{" "}
              Plan it as a routine, not a single event. Keep one folder per work
              with your original, dated proof and the log of each report.
            </>,
            <>
              <strong className={STRONG}>Report each listing, and say what you saw before.</strong>{" "}
              If the same seller or the same image returns, say so in the next
              notice, with the earlier report date. It does not change the law, but
              it gives the reviewer the history.
            </>,
            <>
              <strong className={STRONG}>Check other sites for the same image.</strong>{" "}
              A removal on one marketplace says nothing about the others. See{" "}
              <Link href="/guides/found-your-artwork-on-temu-redbubble-or-amazon" className={LINK}>
                what to do on Temu, Redbubble and Amazon
              </Link>
              .
            </>,
            <>
              <strong className={STRONG}>Keep your proof ready.</strong> See{" "}
              <Link href="/guides/how-to-prove-you-made-your-artwork" className={LINK}>
                how to prove you made your artwork
              </Link>{" "}
              and use the{" "}
              <Link href="/guides/dmca-takedown-notice-template-for-artists" className={LINK}>
                notice template
              </Link>
              .
            </>,
            <>
              <strong className={STRONG}>Think about what you post.</strong> A
              smaller image, a visible name on the file or a watermark in the
              picture will not stop theft, but it makes a copy easier to prove and
              easier to spot.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Where monitoring helps, and where it does not">
        <p>
          If copies come back, the thing you can control is how fast you notice.
          TraceMyAssets checks the artworks you register on a schedule and shows
          possible matches for you to review. Scheduled scans run weekly or
          monthly on the free plan and daily, weekly or monthly on the paid plans.
          In our own tests, the visual comparison recognised copies that were
          resized, recompressed, recoloured or put into a screenshot, but only
          part of the time for small crops and small mockups, and it did not flag
          unrelated images. We tested on three synthetic images, so we make no
          claim about a catch rate on real listings.
        </p>
        <p>
          Limits you should know: we only see public pages a search engine has
          indexed, so a brand-new listing can take time to show up, and a private
          or app-only listing may never appear. A match is a possible match, never
          proof, and you decide what to do and send every notice yourself. We do
          not contact anyone for you and we cannot stop a seller from posting
          again. See{" "}
          <Link href="/blog/three-ways-to-find-copies-of-your-artwork" className={LINK}>
            three ways to find copies of your artwork
          </Link>{" "}
          for how the approaches compare.
        </p>
      </LegalSection>

      <LegalSection heading="What we did not check">
        <LegalList
          items={[
            "How often removed designs return. No source we found measures it.",
            "Current detection or repeat-seller systems at any platform. Their pages describe policy, not results, and the press pieces are from 2018 to 2021.",
            "Whether the incidents in the articles were resolved afterwards.",
            "Platforms we did not research, including Shopify stores, Society6, TeePublic and Pinterest.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Sources">
        <LegalList
          items={[
            <Ext key="a" href="https://printandpromomarketing.com/article/teespring-has-a-stolen-designs-problem/">
              Print &amp; Promo Marketing: Teespring has a stolen designs problem (18 July 2018)
            </Ext>,
            <Ext key="b" href="https://printandpromomarketing.com/?p=128330">
              Print &amp; Promo Marketing: Merch by Amazon sellers say the platform is full of scammers stealing designs (29 September 2021)
            </Ext>,
            <Ext key="c" href="https://waxy.org/2019/12/how-artists-on-twitter-tricked-spammy-t-shirt-stores-into-admitting-their-automated-art-theft/">
              Waxy.org: How artists on Twitter tricked spammy t-shirt stores (December 2019)
            </Ext>,
            <Ext key="d" href="https://etsy.com/legal/ip/">Etsy: Our House Rules (intellectual property)</Ext>,
            <Ext key="e" href="https://help.redbubble.com/hc/en-us/articles/360051811312">
              Redbubble Help: Why was my account restricted?
            </Ext>,
          ]}
        />
      </LegalSection>
    </>
  );
}
