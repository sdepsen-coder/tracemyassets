import type { MatchRecord } from "@/lib/api";

/**
 * Plain-text letters the artist can copy and send from their own account.
 * TraceMyAssets never contacts anyone; these are only starting points.
 */

export type LetterKind = "friendly" | "platform" | "host";

export type LetterInput = {
  artworkTitle: string;
  url: string;
  platform: string | null;
  foundOn: string; // already formatted date
  watermarkVerified: boolean;
  yourName: string;
};

export type Letter = { kind: LetterKind; label: string; hint: string; subject: string; body: string };

export const NAME_PLACEHOLDER = "[Your name]";

/** The address most useful in a letter: the page, else the image itself. */
export function letterUrl(
  match: Pick<MatchRecord, "source_url" | "candidate_page_url" | "candidate_image_url">,
): string | null {
  return match.source_url || match.candidate_page_url || match.candidate_image_url || null;
}

export function formatLetterDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function watermarkLine(input: LetterInput): string {
  return input.watermarkVerified
    ? `The image also carries the invisible watermark of my protected copy, which I can show to match my records.\n\n`
    : "";
}

export function buildLetters(input: LetterInput): Letter[] {
  const name = input.yourName.trim() || NAME_PLACEHOLDER;
  const title = input.artworkTitle.trim() || "my artwork";
  const platform = input.platform?.trim() || "";
  const found = input.foundOn ? ` on ${input.foundOn}` : "";

  const friendly: Letter = {
    kind: "friendly",
    label: "Friendly message",
    hint: "A polite first step to the person or shop that posted it.",
    subject: `Your listing uses my artwork "${title}"`,
    body: `Hello,

I am the artist who created "${title}". I came across it here${found}:

${input.url}

I have not given permission for it to be used or sold on this page. I am sure this may be a misunderstanding, so I am writing to you first.

${watermarkLine(input)}Could you please take it down within 7 days? If you believe you have a licence or permission from me, please send me the details so I can check.

Thank you for your help.

${name}`,
  };

  const platformLetter: Letter = {
    kind: "platform",
    label: "Report to the platform",
    hint: "For marketplaces and social sites. Most have their own copyright form: use this text in it.",
    subject: `Copyright infringement report: ${input.url}`,
    body: `To the ${platform || "[platform]"} copyright team,

I am the original creator and copyright owner of the artwork "${title}". I found a copy of it${found} at:

${input.url}

It is used there without my permission. My original work can be seen at: [link to your portfolio, original post or shop listing].

${watermarkLine(input)}I ask you to remove the material or disable access to it.

I have a good-faith belief that this use is not authorised by me, my agent or the law. The information in this report is accurate, and I am the owner of the rights in this work or authorised to act for the owner.

Name: ${name}
Email: [your email]
Postal address: [your address]

Signed: ${name}`,
  };

  const host: Letter = {
    kind: "host",
    label: "Notice to the website's host",
    hint: "When the site owner does not answer. Send it to the host's abuse or copyright contact.",
    subject: `Copyright notice: unauthorised copy of "${title}"`,
    body: `To the abuse / copyright contact,

I am the creator and copyright owner of the artwork "${title}". A website hosted by your service shows a copy of my work without my permission:

${input.url}

(found${found || " recently"})

I contacted, or tried to contact, the site owner: [describe what you did, or delete this line].

${watermarkLine(input)}Please remove the material or disable access to it, and let me know what you have done.

I have a good-faith belief that this use is not authorised by me, my agent or the law. The information in this notice is accurate, and I am the owner of the rights in this work or authorised to act for the owner.

${name}
[your email]
[your address]`,
  };

  return [friendly, platformLetter, host];
}
