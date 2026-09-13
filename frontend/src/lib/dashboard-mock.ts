export const dashboardStats = [
  {
    label: "Protected Assets",
    value: "12",
    sublabel: "+3 this month",
    tone: "text-emerald-300",
    chipClass: "bg-emerald-400/10 text-emerald-300",
    icon: "verified_user",
    spark: "M0 18L14 14L28 16L44 8L60 10L80 4",
  },
  {
    label: "Active Infringements",
    value: "3",
    sublabel: "2 urgent review",
    tone: "text-sky-300",
    chipClass: "bg-sky-400/10 text-sky-300",
    icon: "radar",
    spark: "M0 8L18 10L32 6L48 14L66 9L80 18",
  },
  {
    label: "Match Accuracy",
    value: "94.8%",
    sublabel: "High fidelity",
    tone: "text-slate-100",
    chipClass: "bg-slate-700/40 text-sky-300",
    icon: "fingerprint",
    spark: null,
  },
  {
    label: "Resolved Cases",
    value: "18",
    sublabel: "+4 takedowns",
    tone: "text-emerald-300",
    chipClass: "bg-emerald-400/10 text-emerald-300",
    icon: "task_alt",
    spark: null,
  },
];

export const dashboardAssets = [
  {
    title: "Abstract Gradient Poster",
    meta: "Digital Artwork · Vector / WebP · Hash: 9f4a..78e2",
    tags: ["Etsy", "Shopify", "Protected"],
    match: "98% max match (3 detections)",
    status: "Review Matches",
    statusTone: "text-sky-300",
    badgeTone: "bg-emerald-400/10 text-emerald-300",
    thumbnail:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=400&q=80",
    alert: true,
  },
  {
    title: "Luxury Product Mockup",
    meta: "Product Photography · PSD Pack · 3,840 × 2,160",
    tags: ["Shopify", "Amazon"],
    match: "Deep Scan 74%",
    status: "Scanning marketplaces",
    statusTone: "text-slate-300",
    badgeTone: "bg-sky-400/15 text-sky-300",
    thumbnail:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=400&q=80",
    alert: false,
  },
  {
    title: "Brand Illustration Set",
    meta: "Vector SVG Pack · 48 assets · Web crawl active",
    tags: ["Global Web", "Pinterest"],
    match: "0 matches",
    status: "Verified clean",
    statusTone: "text-emerald-300",
    badgeTone: "bg-emerald-400/10 text-emerald-300",
    thumbnail:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80",
    alert: false,
  },
];

export const dashboardEvents = [
  {
    title: "Potential match detected on Shopify store",
    meta: '12 min ago · "Abstract Gradient Poster"',
    tone: "bg-sky-400",
  },
  {
    title: "Fingerprint index completed: Luxury Product Mockup",
    meta: "34 min ago · 24 crawlers deployed",
    tone: "bg-cyan-400",
  },
  {
    title: "DMCA Notice acknowledged & listing de-indexed",
    meta: "Yesterday · Etsy Seller #44091",
    tone: "bg-emerald-400",
  },
];