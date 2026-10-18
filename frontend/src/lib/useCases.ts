/**
 * Copy for the /for/<slug> pages. Same rules as the rest of the site: say
 * only what is measured in docs/test-results.md or visible in the code, say
 * "copies" and "unlicensed use" (never "stolen"), and keep the limits next
 * to the strengths.
 */
export type UseCase = {
  slug: string;
  /** Short label used in links, e.g. "Etsy sellers". */
  label: string;
  title: string;
  description: string;
  lead: string;
  /** Why checking is worth it for this audience. */
  why: string[];
  /** What was measured that matters most to this audience. */
  measuredHeading: string;
  measured: string[];
  /** Extra limits that are specific to this audience. */
  limits: string[];
  /** Trademark or affiliation line, when a brand is named. */
  notice?: string;
};

export const USE_CASES: UseCase[] = [
  {
    slug: "etsy-sellers",
    label: "Etsy sellers",
    title: "For Etsy sellers",
    description:
      "Watch the public web for copies of your digital downloads, prints and listing artwork, and review what turns up.",
    lead: "Digital downloads, prints and mockups can end up on other shops and print sites. TraceMyAssets watches the public web for copies of the artwork you register and shows you what it found, so you can check it and decide what to do.",
    why: [
      "Copies of artwork can turn up on marketplaces and print shops. Looking for them by hand means searching again and again.",
      "A scheduled scan does that for you. When it finds something new, we email you a count and a link, never the page itself.",
    ],
    measuredHeading: "Listing photos and mockups",
    measured: [
      "Many listing photos show the artwork inside a mockup. In our tests, a copy framed and hung in a room mockup (the artwork about 40 percent of the width) was recognised on every test image. Smaller mockups (about 25 percent) were recognised only some of the time.",
      "How Etsy fits in: we do not connect to Etsy or any other shop. A copy on an Etsy listing can show up only when a search engine has indexed that listing page. A listing that is not indexed cannot be found.",
    ],
    limits: [
      "When you find a copy, report it to the marketplace through its own copyright process. We never send notices or contact anyone for you.",
    ],
    notice:
      "Etsy is a trademark of Etsy, Inc. TraceMyAssets is not affiliated with or endorsed by Etsy.",
  },
  {
    slug: "photographers",
    label: "photographers",
    title: "For photographers",
    description:
      "Find copies of your photographs on the public web, including resized and cropped ones, and compare them with your original.",
    lead: "A photograph that is shared can end up cropped, resized or recompressed. TraceMyAssets looks for copies by how they look, not only by an invisible mark, and shows you each find next to your original.",
    why: [
      "A copy that was shrunk or cropped no longer carries the invisible mark, which is why every result is also compared with your original by its look.",
      "Your original stays private. You share the protected copy instead.",
    ],
    measuredHeading: "Resized and cropped copies",
    measured: [
      "In our tests the invisible mark was lost after any resize or crop. The comparison by look still recognised copies resized to half, recompressed, screenshot-like, brightened, or cropped to the middle 60 percent, on every test image.",
      "Very small copies (a quarter of the size) and a small corner of the image were recognised only some of the time, so expect to miss some of those.",
    ],
    limits: [
      "Our test images were generated paintings, not photographs. Real photographs differ in texture, grain and flat areas, so treat the results as a guide, not a guarantee.",
    ],
  },
  {
    slug: "illustrators",
    label: "illustrators",
    title: "For illustrators",
    description:
      "Watch the public web for copies of your illustrations and digital art, and review matches next to your original.",
    lead: "Digital art is easy to save and repost. TraceMyAssets watches the public web for copies of the artwork you register and compares each find with your original, so you decide what is a copy and what to do about it.",
    why: [
      "Reposted art does not always credit you or ask first. A scheduled scan checks for new copies for you and emails you a count and a link when something new turns up.",
      "Each match shows both images side by side, how strong the match is, and whether your invisible mark is inside.",
    ],
    measuredHeading: "Colour changes and re-created images",
    measured: [
      "In our tests the invisible mark survived saving as PNG, JPEG at quality 85 or higher, a contrast increase, black and white, a hue shift and a sepia tone. A brightness change, resizing, cropping, rotating and mirroring removed it. The comparison by look recognised resized, brightened and cropped copies (the middle 60 percent); we did not test how well it recognises rotated or mirrored ones.",
      "Re-creating an image with an AI tool is a known way marks like this can be removed. We have not tested it, and we have not tested how well such re-created copies are recognised by look.",
    ],
    limits: [
      "Posts on social networks can only be found when a search engine has indexed them. Some networks and most private groups are out of reach.",
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((useCase) => useCase.slug === slug);
}
