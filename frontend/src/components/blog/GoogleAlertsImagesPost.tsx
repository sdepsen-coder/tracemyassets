import Link from "next/link";
import type { ReactNode } from "react";

import { BlogFlow } from "@/components/blog/BlogFlow";
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
 * Practical piece. Google claims rest on Google's own help pages for Alerts
 * and for searching by image. Product claims match the landing page and
 * lib/plans.ts: scheduled scans on every plan, an email with a count and a
 * link, source locations on paid plans, public indexed pages only.
 */
export function GoogleAlertsImagesPost() {
  return (
    <>
      <p className="text-[18px] leading-8 text-[var(--text-muted)]">
        You can set an alert for your name. But what happens when someone
        reposts your illustration without your name attached? That is the gap
        artists run into when they look for &ldquo;Google Alerts for
        images&rdquo;. They want to upload an artwork once and hear about it
        when a copy turns up elsewhere.
      </p>

      <LegalSection heading="The short answer">
        <p>
          <strong className={STRONG}>
            Google Alerts does not offer an upload-an-image-and-monitor-it
            workflow.
          </strong>{" "}
          Its documented setup follows topics and search terms. Google Lens lets
          you search using an image, but that is a separate workflow. To keep
          checking over time, you need a repeatable manual routine or a service
          with scheduled image scans.
        </p>
        <p>
          Sources:{" "}
          <Ext href="https://support.google.com/websearch/answer/4815696?hl=en">
            Google Alerts documentation
          </Ext>
          ,{" "}
          <Ext href="https://support.google.com/websearch/answer/1325808">
            Google Lens documentation
          </Ext>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What Google Alerts can do for an artist">
        <p>
          Google Alerts can email you when new matching search results appear
          for a topic. Useful starting points include your artist name, shop
          name, or a distinctive collection title. You enter the topic, choose
          your notification preferences, and create the alert.{" "}
          <Ext href="https://support.google.com/websearch/answer/4815696?hl=en">
            How to create a Google Alert
          </Ext>
          . That can help you discover mentions of your work.
        </p>
        <p>
          But imagine someone takes your fox illustration, puts it on a mug, and
          lists it as &ldquo;Woodland Coffee Cup&rdquo;. Your name and the
          original artwork title are missing. An alert for your name has little
          to work with. You need to search using the image itself.
        </p>
      </LegalSection>

      <LegalSection heading="Start with a reverse image search">
        <p>
          Choose an artwork you want to check. A useful starting point is a
          piece you sell, license, or regularly share.
        </p>
        <p>
          On a computer, open Google, select <strong className={STRONG}>Search by
          image</strong>, and upload the image. You can also supply an image URL.
          Google Lens results can include similar images and websites containing
          the image or something visually similar.{" "}
          <Ext href="https://support.google.com/websearch/answer/1325808">
            Google&apos;s image-search instructions
          </Ext>
          .
        </p>
        <p>
          Review the pages behind the results. A similar colour palette or
          subject does not necessarily mean someone copied your work. For each
          promising result, ask:
        </p>
        <LegalList
          items={[
            "Is this my actual artwork, or simply a similar image?",
            "Is this my own listing, an authorised seller, or a use I already know about?",
            "Do I need to save the page address and investigate further?",
          ]}
        />
        <p>
          For a broader explanation of the available approaches, see{" "}
          <Link href="/blog/three-ways-to-find-copies-of-your-artwork" className={LINK}>
            three ways to find copies of your artwork
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="A search today cannot answer what appears next month">
        <p>
          You search for an illustration on Monday and find nothing. A new
          product listing appears on Friday. It becomes discoverable by a search
          engine later. Monday&apos;s search is still finished. It cannot tell
          you about that later listing.
        </p>
        <p>
          This is the practical reason to monitor your images:{" "}
          <strong className={STRONG}>repeat the check as the web changes.</strong>
        </p>
        <BlogFlow
          title="From one search to an ongoing routine"
          steps={[
            { title: "Choose an artwork" },
            { title: "Run an image search" },
            { title: "Review possible matches" },
            { title: "Wait until the next scheduled check" },
          ]}
          ending="↻ Repeat from step 02 at the next check. New finding? Review the source page."
          caption="A repeated check creates another opportunity to find a copy. It does not guarantee discovery."
        />
        <p>
          If you have a small portfolio, a calendar reminder and a simple record
          of checked URLs may be enough. Start with a schedule you can maintain.
          As the portfolio grows, the work is less about performing one search
          and more about remembering which images you checked, which results you
          already reviewed, and when to check again.
        </p>
      </LegalSection>

      <LegalSection heading="How scheduled monitoring works in TraceMyAssets">
        <p>
          TraceMyAssets lets you add an artwork and choose an automatic scan
          schedule. When a scheduled scan finds something new, it emails you a
          count and a link to review the results. You can compare possible
          matches with your original and decide what needs attention. Your
          original stays private, and you receive a copy with an invisible
          watermark to share.
        </p>
        <p>
          The two functions serve different purposes: scheduled scans look for
          possible copies, while the watermark provides an additional signal when
          it remains readable. A readable watermark is not required for every
          visual match, and the watermark does not survive every edit.{" "}
          <Link href="/#how-it-works" className={LINK}>
            How TraceMyAssets works
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What an image alert cannot tell you">
        <p>
          An alert is a lead to review. TraceMyAssets searches public pages
          discoverable through its search sources. Private groups, closed apps,
          and pages those sources have not indexed can be outside its reach. A
          shop listing may appear when it is indexed; that does not mean the
          service has direct access to the shop&apos;s entire catalogue.{" "}
          <Link href="/#sources" className={LINK}>
            Search coverage and limitations
          </Link>
          .
        </p>
        <LegalList
          items={[
            <>
              <strong className={STRONG}>No results</strong> does not establish
              that nobody has copied your work.
            </>,
            <>
              <strong className={STRONG}>A newly found result</strong> does not
              establish when the image was first posted.
            </>,
            <>
              <strong className={STRONG}>A visual match</strong> does not
              establish whether the use was authorised.
            </>,
          ]}
        />
        <p>Checking the context is still your decision.</p>
      </LegalSection>

      <LegalSection heading="Build a routine around the work that matters most">
        <p>
          You do not need to begin with every sketch you have ever posted. Start
          with a few pieces that matter to your business: a bestselling print, a
          frequently licensed illustration, or a design you have already seen
          reposted. Run an initial search, review what appears, then choose how
          you will repeat the check.
        </p>
        <p>
          Keep name-based alerts alongside image searches if they are useful to
          you. They answer different questions: one follows mentions; the other
          looks for the image. Not sure what to start with? See{" "}
          <Link href="/blog/which-artworks-should-you-monitor-first" className={LINK}>
            which artworks to monitor first
          </Link>
          .
        </p>
      </LegalSection>
    </>
  );
}
