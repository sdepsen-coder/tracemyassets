import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { LegalPage } from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Help — ${SITE_NAME}`,
  description: `Answers to common questions about ${SITE_NAME}.`,
};

type Faq = { question: string; answer: ReactNode };
type Group = { title: string; items: Faq[] };

const GROUPS: Group[] = [
  {
    title: "Getting started",
    items: [
      {
        question: "What does TraceMyAssets do?",
        answer: (
          <p>
            You register your artwork, and we search the sources we support
            for pages that show an image like yours. Each possible copy is
            compared with your original (and with your invisible watermark)
            before it is shown to you as a match. You review the matches and
            decide what to do. We never contact anyone on your behalf.
          </p>
        ),
      },
      {
        question: "How do I add an artwork?",
        answer: (
          <p>
            Press <strong>Upload artwork</strong> at the top of the
            dashboard, choose your image and give it a title. Your original
            stays private. You also get a protected copy with an invisible
            watermark: share that one instead of the original.
          </p>
        ),
      },
      {
        question: "What is the invisible watermark?",
        answer: (
          <p>
            A pattern woven into the protected copy that you cannot see. If
            a copy of that file turns up online, the watermark can link it
            back to your artwork. It is designed to survive everyday changes
            such as resizing, but how well it survives heavy editing is
            still being tested, so treat it as one signal among several.
          </p>
        ),
      },
      {
        question: "Which copy should I share online?",
        answer: (
          <p>
            Always the protected (watermarked) copy, never your original.
            Only the protected copy can carry your watermark.
          </p>
        ),
      },
    ],
  },
  {
    title: "Scans",
    items: [
      {
        question: "What is the difference between a Standard and a Deep scan?",
        answer: (
          <>
            <p>
              A <strong>Standard scan</strong> is free and also runs on the
              schedule you choose for each artwork. You can also start one
              by hand; a Free account has 5 of those a month (the count
              resets on the 1st, and scheduled scans do not use it). A{" "}
              <strong>Deep scan</strong> looks further, using an additional
              image-search source, and uses 1 credit. Matches a deep scan
              recorded carry a small <strong>Deep scan</strong> tag.
            </p>
            <p>
              Either way, every result is checked against your original
              before it counts as a match.
            </p>
          </>
        ),
      },
      {
        question: "What are credits?",
        answer: (
          <p>
            Credits pay for Deep scans: one credit per scan. During the
            private beta every account starts with a few free credits, given
            once your email address is confirmed. If a
            Deep scan could not run at all (for example the search service
            was unavailable), the credit is returned automatically. If you
            run out, contact us.
          </p>
        ),
      },
      {
        question: "How often are my artworks checked?",
        answer: (
          <p>
            Each artwork has its own monitoring settings: you choose the
            frequency (Free accounts: weekly or monthly) and the similarity
            level at which a result is worth flagging. You can also run a
            scan yourself (within your monthly allowance of hand-started
            Standard scans). To save resources, automatic scans of a Free
            account pause after 60 days without opening the app, and resume
            as soon as you sign in again.
          </p>
        ),
      },
      {
        question: "Why did a scan find nothing?",
        answer: (
          <p>
            We can only look where our sources can see. A copy on a page
            that no search engine has indexed cannot be found, and a result
            whose page does not actually show your image is left out on
            purpose. No match is encouraging, but it is not proof that no
            copy exists. A Deep scan sometimes finds what a Standard scan
            missed.
          </p>
        ),
      },
      {
        question: "Why do scan results change between scans?",
        answer: (
          <p>
            Search sources return different results from day to day, and the
            web itself changes. That is why monitoring repeats the scan on a
            schedule.
          </p>
        ),
      },
    ],
  },
  {
    title: "Matches",
    items: [
      {
        question: "What does a match card tell me?",
        answer: (
          <>
            <p>
              Each card shows your artwork next to what was found, how
              similar they are, and how sure we are:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Watermark verified</strong>: the invisible watermark
                in your protected copy was found in this image. The
                strongest signal.
              </li>
              <li>
                <strong>Strong visual match</strong>: the images match
                closely in both overall look and detail.
              </li>
              <li>
                <strong>Possible visual match</strong> and{" "}
                <strong>Limited visual similarity</strong>: similar, but not
                conclusive. Compare by eye.
              </li>
            </ul>
            <p>
              The card also says what kind of page it is (an item page, a
              general web page, a search or category page, or just an
              image). The same picture found on several pages is shown as
              one card with the other pages listed under it.
            </p>
          </>
        ),
      },
      {
        question: "Does a match mean my work was copied?",
        answer: (
          <p>
            Not by itself. Matches are technical signals for you to review.
            They are not legal proof of copying, and they do not by
            themselves establish ownership or infringement.
          </p>
        ),
      },
      {
        question: "What do Review, Ignore, Archive and Delete do?",
        answer: (
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Review</strong>: you are looking into it. Afterwards
              press <strong>Mark reviewed</strong> to move it to the
              Confirmed tab.
            </li>
            <li>
              <strong>Ignore</strong>: not a problem, for example your own
              listing. It moves to the Ignored tab.
            </li>
            <li>
              <strong>Archive</strong>: keep a record but take it out of
              your to-do list.
            </li>
            <li>
              <strong>Delete</strong>: remove the match entirely. You can
              select several cards and delete them together.
            </li>
          </ul>
        ),
      },
      {
        question: "What are the Useful / Irrelevant / Unrelated / Different buttons?",
        answer: (
          <p>
            They tell us whether a result was right. Your answers help us
            see where the checker is wrong and improve it. They do not
            change the match itself.
          </p>
        ),
      },
      {
        question: "Why is the source of a match hidden?",
        answer: (
          <p>
            Some plans show that a match exists and how strong it is, but
            not which page it was found on. The page address is shown on
            plans that include sources.
          </p>
        ),
      },
      {
        question: "Someone is using my work. What now?",
        answer: (
          <p>
            Report it directly to the marketplace or website concerned; each
            has its own copyright or intellectual-property process.{" "}
            {SITE_NAME} does not send notices or contact anyone for you.
            Keep the match card and the comparison as a record.
          </p>
        ),
      },
    ],
  },
  {
    title: "Check an Image",
    items: [
      {
        question: "What is Check an Image?",
        answer: (
          <p>
            If you spot something suspicious, upload that image on the{" "}
            <Link
              href="/check"
              className="text-[var(--primary)] underline"
            >
              Check an Image
            </Link>{" "}
            page and see how it compares with your registered artwork,
            including whether your watermark is in it.
          </p>
        ),
      },
    ],
  },
  {
    title: "Account and privacy",
    items: [
      {
        question: "I forgot my password.",
        answer: (
          <p>
            On the sign-in screen choose &ldquo;Forgot password&rdquo; and
            enter your email. We send a one-time link that works for an
            hour. Resetting your password also signs you out everywhere
            else.
          </p>
        ),
      },
      {
        question: "Can I sign in with Google?",
        answer: (
          <p>
            Yes: choose &ldquo;Continue with Google&rdquo; on the sign-in
            screen. If you already have an account with the same email
            address, it is the same account.
          </p>
        ),
      },
      {
        question: "How do I sign out of all my devices?",
        answer: (
          <p>
            Open the account menu (the round button with your initial at the
            top right) and choose <strong>Sign out of all devices</strong>.
            Do this if you used a shared computer or lost a device.
          </p>
        ),
      },
      {
        question: "Who can see my artwork and matches?",
        answer: (
          <p>
            Only you. Originals are never public, and matches are visible
            only to your account. For how data is handled in detail, read
            the{" "}
            <Link
              href="/privacy"
              className="text-[var(--primary)] underline"
            >
              Privacy
            </Link>{" "}
            page.
          </p>
        ),
      },
      {
        question: "How do I delete an artwork or my account?",
        answer: (
          <p>
            Use <strong>Delete</strong> on the artwork in your dashboard: it
            permanently removes the artwork, its files, scans and matches.
            To delete your whole account, contact us.
          </p>
        ),
      },
      {
        question: "When will email alerts arrive?",
        answer: (
          <p>
            Email alerts are on the way. Until then, the bell at the top of
            the page and the Matches page show anything new.
          </p>
        ),
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <LegalPage title="Help and FAQ">
      <p className="text-[15px] leading-relaxed text-[var(--text-muted)]">
        Quick answers about {SITE_NAME}. Can&apos;t find yours? See the{" "}
        <Link href="/support" className="text-[var(--primary)] underline">
          Support
        </Link>{" "}
        page
        {CONTACT_EMAIL ? (
          <>
            {" "}
            or write to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[var(--primary)] underline"
            >
              {CONTACT_EMAIL}
            </a>
          </>
        ) : null}
        .
      </p>

      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="text-lg font-semibold">{group.title}</h2>

          <div className="mt-3 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {group.items.map((item) => (
              <details key={item.question} className="group px-4 py-3">
                <summary className="cursor-pointer list-none text-[15px] font-medium text-[var(--text)] marker:content-none">
                  <span className="flex items-start justify-between gap-3">
                    <span>{item.question}</span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 text-[var(--text-muted)] transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>

                <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-[var(--text-muted)]">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </LegalPage>
  );
}
