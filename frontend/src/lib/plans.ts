/**
 * What the plans offer, as shown on the public pricing page.
 *
 * Only things the app really enforces are listed (see backend
 * core/plan_limits.py). If a number changes there, change it here.
 * Paid plans are not open yet, so there is no checkout link anywhere.
 */

export type PlanCard = {
  id: "free" | "pro" | "extra";
  name: string;
  price: string;
  per: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export const PAID_PLANS_OPEN = false;

export const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    per: "no card needed",
    tagline: "Try it on your own work.",
    features: [
      "Up to 3 artworks",
      "5 hand-started Standard scans a month",
      "3 Deep scan credits when you sign up (once)",
      "You see that a match exists and how strong it is; the page it was found on is hidden",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12.99",
    per: "per month",
    tagline: "For artists who sell their work.",
    highlight: true,
    features: [
      "Up to 25 artworks",
      "Automatic checks daily, weekly or monthly",
      "30 hand-started Standard scans a month",
      "Deep scan credits included (amount announced when paid plans open)",
      "See exactly where each match was found, with a link",
      "Step-by-step guide and copyable letters for reporting a copy",
    ],
  },
  {
    id: "extra",
    name: "Extra",
    price: "$29.99",
    per: "per month",
    tagline: "For large catalogues and studios.",
    features: [
      "Up to 100 artworks",
      "Automatic checks daily, weekly or monthly",
      "100 hand-started Standard scans a month",
      "More Deep scan credits included (amount announced when paid plans open)",
      "See exactly where each match was found, with a link",
      "Step-by-step guide and copyable letters for reporting a copy",
    ],
  },
];

export const PRICING_NOTE =
  "Paid plans are not open yet. The limits above are the current beta values and may change before they open. Prices are in US dollars; local taxes may be added at checkout.";
