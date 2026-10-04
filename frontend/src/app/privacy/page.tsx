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
            "Feedback you choose to send: your verdicts on matches (useful, irrelevant, unrelated, different) and any answers or messages you submit through the feedback form. A verdict keeps only a small technical snapshot of the match (its similarity result and source type), not the address where it was found, and it is kept even if you later delete the artwork, so we can improve how matches are judged.",
            "A session cookie that keeps you signed in. We do not use advertising or analytics trackers.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          Only to provide the service: storing your artwork, watermarking it,
          scanning supported online sources for visually similar images, and
          showing you the results. We do not sell your data, and we do not
          use your artwork to train models.
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
          removes its files, scan history and matches. To delete your whole
          account and its data, contact us using the address below and we
          will do so.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can ask us for a copy of your data, to correct it, or to delete
          it. Contact us using the address below.
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
