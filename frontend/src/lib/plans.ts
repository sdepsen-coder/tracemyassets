/**
 * What the plans offer, as shown on the public pricing page.
 *
 * Only things the app really enforces are listed (see backend
 * core/plan_limits.py). If a number changes there, change it here.
 * Whether a paid plan can be bought is decided by the server
 * (/billing/config), not here.
 */

export type PlanCard = {
  id: "free" | "pro" | "extra";
  name: string;
  price: string;
  per: string;
  tagline: string;
  features: string[];
  highlight?: boolean;
  /** Paid plans: US dollars a month and a year, to show both prices. */
  monthlyUsd?: number;
  yearlyUsd?: number;
};

/** "23%": how much cheaper a year is than twelve months. */
export function yearlySavingPercent(plan: PlanCard): number | null {
  if (!plan.monthlyUsd || !plan.yearlyUsd) return null;
  const saving = 1 - plan.yearlyUsd / (plan.monthlyUsd * 12);
  return saving > 0 ? Math.round(saving * 100) : null;
}

export const PLANS: PlanCard[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    per: "no card needed",
    tagline: "Try it on your own work.",
    features: [
      "Up to 3 artworks",
      "Automatic checks weekly or monthly",
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
    monthlyUsd: 12.99,
    yearlyUsd: 120,
    tagline: "For artists who sell their work.",
    highlight: true,
    features: [
      "Up to 40 artworks",
      "Automatic checks daily, weekly or monthly",
      "30 hand-started Standard scans a month",
      "10 Deep scan credits every month",
      "See exactly where each match was found, with a link",
      "Step-by-step guide and copyable letters for reporting a copy",
    ],
  },
  {
    id: "extra",
    name: "Extra",
    price: "$29.99",
    per: "per month",
    monthlyUsd: 29.99,
    yearlyUsd: 240,
    tagline: "For large catalogues and studios.",
    features: [
      "Up to 100 artworks",
      "Automatic checks daily, weekly or monthly",
      "100 hand-started Standard scans a month",
      "40 Deep scan credits every month",
      "See exactly where each match was found, with a link",
      "Step-by-step guide and copyable letters for reporting a copy",
    ],
  },
];

export const PRICING_NOTE =
  "Prices are in US dollars; taxes such as VAT are added at checkout where they apply. Nothing is charged until you confirm in the payment window.";
