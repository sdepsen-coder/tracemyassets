import type { Metadata } from "next";

import {
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/legal/LegalPage";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy — ${SITE_NAME}`,
  description: `How ${SITE_NAME} handles your account and artwork data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_LAST_UPDATED}>
      <LegalSection heading="Overview">
        <p>
          {SITE_NAME} is a private beta service run by its founder in the
          United Kingdom. It helps artists register their artwork, create
          a protected copy with an invisible watermark, and review possible
          unauthorised uses found online. This page explains what data the
          service handles and who it is shared with. It is a plain-language
          summary for the beta, not a substitute for legal advice.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <LegalList
          items={[
            "Account data: your email address and a password hash (we never store your password itself).",
            "Artwork you upload: the original file, a thumbnail, a protected watermarked copy, and a visual fingerprint (perceptual hash) computed from it, plus the title you give it.",
            "Monitoring data: your scan settings, scan history, and the possible matches found for your artwork (including the address of the page and image where a possible copy was found, and similarity results).",
            "Feedback you choose to send: your verdicts on matches (useful, irrelevant, unrelated, different) and any answers or messages you submit through the feedback form. A verdict keeps only a small technical snapshot of the match (its similarity result and source type), not the address where it was found, and it is kept even if you later delete the artwork, so we can improve how matches are judged. It is deleted if you delete your account.",
            "A security and activity log: when you sign up, sign in (or fail to), reset your password, upload an artwork, run a scan or send feedback, we record the time, your IP address and your browser type. We use it to keep accounts safe, to spot abuse (for example many accounts created from one address) and to help when you contact support. It is deleted automatically after 90 days.",
            "A session cookie that keeps you signed in. It is always on because signing in needs it.",
            "Optional analytics: if you accept the cookie banner, we use Google Analytics 4 to count page views and see which pages are useful. It sets cookies (_ga, _ga_*) and sends your page visits and a shortened IP address to Google. Nothing from Google is loaded, and no analytics cookie is set, unless you press Accept. You can change your mind at any time with \"Cookie settings\" in the footer; declining removes the cookies. We do not use advertising trackers, and the signed-in admin area is never measured.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          Only to provide the service: storing your artwork, watermarking it,
          scanning supported online sources for visually similar images, and
          showing you the results. We do not sell your data, and we do not
          use your artwork to train models.
          The activity log described above is used only for security,
          preventing abuse and support, and can be seen only by the
          service's administrator.
        </p>
      </LegalSection>

      <LegalSection heading="Who we share it with">
        <p>
          To run scans, some data is sent to third-party services. This is
          the complete list at the time of writing:
        </p>
        <LegalList
          items={[
            "Hosting: our application, database and file storage run on Railway.",
            "Google Cloud Vision (Web Detection): when a scan runs, the image of the artwork being monitored is sent to Google to look for visually similar images on the web.",
            "Deep scan (Google Lens, through the search data provider SerpApi): when you run a deep scan, a link to the watermarked copy of your artwork is sent to SerpApi, and through it to Google, so Google can find pages showing the same image. The link works for only ten minutes and can open nothing but that one image. We keep no copy of the results beyond the possible matches shown to you.",
            "Marketplace search: the title you give an artwork is sent as a search keyword to marketplace search services, including the Etsy API and a third-party Amazon search data provider. Only the title is sent, not the image. Any candidate images returned are downloaded by our servers for comparison and are not kept.",
            "Resend (email): if monitoring is on for an artwork, we email you when a scan finds new possible matches. To send it, your email address, the artwork's title and the number of new matches are passed to Resend. The email never contains where a match was found.",
            "Fonts and icons are loaded from Google Fonts by your browser.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="Third-party marketplace content">
        <p>
          Listings and images found on marketplaces belong to their owners.
          We compare them against your artwork and, for each possible match,
          keep only the link to where it was found and the comparison
          result, so that you can review it. We do not collect personal
          information about marketplace sellers.
        </p>
      </LegalSection>

      <LegalSection heading="Retention and deletion">
        <p>
          You can permanently delete any artwork from the dashboard; this
          removes its files, scan history and matches.
        </p>
        <p>
          You can delete your whole account yourself: open the menu and
          choose Account and data. Your account, artworks and their files,
          scan history, matches, credits, feedback and sign-in records are
          removed straight away. Entries in the security and activity log
          stay until their 90 days are over, but they are no longer linked
          to you. So that deleting and re-registering cannot be used to
          collect the free welcome credits twice, we keep for one year a
          one-way fingerprint of your mailbox (it is not your address and
          cannot be turned back into it). Copies in our hosting
          provider&apos;s backups disappear when those backups expire.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can download a copy of your data and delete your account
          yourself from Account and data in the menu. To correct your data
          or to use any other right, contact us using the address below.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          {CONTACT_EMAIL ? (
            <>
              Questions about privacy:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-[var(--primary)] underline"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </>
          ) : (
            "Contact details will be published here shortly."
          )}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
