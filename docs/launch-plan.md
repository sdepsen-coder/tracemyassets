# Launch plan (working document)

Written 2026-10-23. A day-by-day plan to go from "payments work" to a first
group of paying users, with decision points where we choose between options
(A, B, C) based on real numbers. Update it every Monday.

Ground rules (same as the rest of the project):

- Everything on the site is backed by `docs/test-results.md` or by the code.
  No invented numbers, testimonials or capabilities. Say "copies" and
  "unlicensed use", never "stolen", on the site. (Search phrases people type may
  contain other words; use them for research, not for our copy.)
- The owner sends every outreach message. No bulk or automated messaging, no
  scraping.
- Secrets stay in Railway only.
- Nothing about a real artist or artwork is shown without written permission.

## 1. The compass

| Level | Number | Meaning |
| --- | --- | --- |
| Target | 100 active paying subscriptions by the end of month 5 | The direction. Check at every gate whether the current pace reaches it. |
| Floor | about 50 to 70 | Still a good result: the product and the direction are right. |
| Alarm | fewer than about 15 at the end of month 3 | A product or channel problem. Stop adding effort to the same thing and run the funnel analysis (section 8). |

The floor and the alarm are proposals. Rewrite them once there is real data.

Assumptions behind the target (not measured yet): reaching 100 active paying
users probably needs roughly 1,000 to 3,300 sign-ups if 3 to 10 percent of
sign-ups end up paying, plus extra gross sign-ups to cover cancellations. That
is about 50 to 150 new sign-ups a week for 3 to 5 months. Replace these with the
real conversion rates as soon as the trial gives them.

## 2. Inputs to fill in (owner)

| Question | Answer |
| --- | --- |
| Hours per week available for this | unknown |
| Monthly budget (tools and ads); ads cap is USD 100 a month | USD 100 max for ads |
| Existing audience (followers, email list, artists you know) | unknown |
| Languages for content (site is English; Turkish sellers can be reached directly) | English site |

## 3. Operating rhythm

Daily (60 to 120 minutes, adjust to the hours above), always in this order:

1. **Ship** one thing that moves a metric (a page, a fix, a post).
2. **Reach** a few people directly (invitations, replies, community answers).
3. **Look** at the dashboard for 5 minutes (Sentry, uptime, admin overview, the
   weekly sheet).

Weekly (Monday, 20 minutes): fill the numbers in section 9, pick the single
priority for the week, and compare the pace with the target.

## 4. Phase 0, weeks 0 to 2: foundations, SEO first

Search needs time to start working, so the technical SEO and the first content
go first; outreach for the closed trial runs in parallel.

### What is already in place (checked on the live site, 2026-10-23)

- Page titles and descriptions, canonical links, `robots.txt`, a sitemap with 11
  addresses, a social-preview image, and structured data (Organization, WebSite,
  SoftwareApplication) on the home page; FAQ structured data on the Help page.
- The home page text is present in the HTML a crawler receives.
- Private areas (admin, app pages, API) are blocked in `robots.txt`.

### Gaps found

Status 2026-10-23: gaps 1, 2 and 8 are fixed and live; the first guide
(`/guides/what-an-invisible-watermark-survives`) and the guides section are
built; gaps 3, 6 and 7 are still open.

1. **The home page and /about send crawlers an empty shell.** Their HTML
   contains only "Checking your session..." (no heading, no text); the real page
   appears after JavaScript runs because it sits behind the sign-in check. Google
   can render JavaScript, but indexing the most important page this way is
   slower and less reliable. This is the biggest SEO fix.
2. `www.tracemyassets.com` answers 200 instead of redirecting to the main
   address (the canonical link points to the main address, which helps, but a
   301 is cleaner).
3. No Search Console verification and no analytics are active yet (the
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and `NEXT_PUBLIC_GA_ID` build variables
   are not set). Without them there is no search data.
4. Only 11 addresses can rank, and no content answers what people search for.
5. The `/for/...` pages have no structured data; the sitemap uses one shared
   date for every page.
6. No event tracking for sign-up, first artwork, first scan or purchase.
7. Core Web Vitals have not been measured (run PageSpeed Insights on the home
   page, a `/for/...` page and Help, mobile and desktop).
8. Wording rule: the words "beta" and "private beta" are still on the Privacy,
   Support and Terms pages and in the in-app feedback dialog. The site rule is
   no "beta / coming soon" wording; fix before inviting people.

### SEO checklist for this site

Adapted from the generic SaaS SEO checklist. Items that do not apply are left out
(hreflang: English only; 301s for changed URLs: none changed; integrations and
"alternatives" pages: later, if ever; behaviour-recording tools: skipped for
privacy; image-format work: the site uses almost no raster images).

| Item | State | Action |
| --- | --- | --- |
| HTTPS, http to https redirect | Done | none |
| One main address (www to non-www) | Gap 2 | 301 redirect in the app config |
| Sitemap, robots.txt, canonical links | Done | Per-page dates; add new guides as they ship; submit in Search Console |
| Unique title and description per page | Mostly done | Review each public page; make the `/for/...` titles more specific |
| One H1 and a sensible H2/H3 outline | Fine on content pages | Re-check after fix 1 (the home page has none in its HTML today) |
| Server-rendered content for crawlers | Gap 1 | Render the home and about pages server-side; show the sign-in check only for signed-in users |
| Private pages noindex | Done (meta noindex and robots.txt) | none |
| Structured data | Home and Help done | Add WebPage/BreadcrumbList to `/for/...`, Article and BreadcrumbList to guides; validate in the Rich Results Test; only state what the page really says |
| Open Graph and social image | Done | A separate image per guide later |
| 404 handling | Done (real 404) | none |
| Search Console and Bing Webmaster | Gap 3 | Owner, day 1 |
| Analytics and conversion events | Gap 3 and 6 | Decision 1 below |
| Core Web Vitals | Gap 7 | Owner measures; fix what the report names |
| Internal links | Partial | Footer and in-page links to `/for/...` and guides; every guide links to the product and to two other guides |
| Content that answers real searches | Gap 4 | Guides (Decision 2); a page on what an invisible watermark survives, from our measured table |
| Free helpful tool (optional, later) | Not started | Only if it is honest and useful; evaluate after the first guides |

### Days 1 to 14

| Day | Owner | Claude |
| --- | --- | --- |
| 1 | Verify the domain in Google Search Console, preferably with a DNS TXT record (no code change). Submit `https://tracemyassets.com/sitemap.xml`. Import the site into Bing Webmaster Tools from Search Console. | List every public page with its title, description and heading so we can improve them. |
| 2 | Choose the analytics option (decision 1 below), create the account, and set the build variable in Railway if GA4. | Add the sign-up, first-artwork, first-scan, checkout-started and purchase events, behind the existing consent rules. |
| 3 | Review the page list; check the sign-in check change (gap 1) on your phone. | SEO code pass: server-render the home and about pages (gap 1), www to non-www redirect, better titles and descriptions, structured data for `/for/...` pages, per-page sitemap dates, footer link block, remove the "beta" wording (gap 8). |
| 4 | Pick the first 10 search phrases (decision 2 and section 5). | Draft the content calendar and the outlines of the first three guides. |
| 5 | Review and correct guide 1 (you know the topic best). | Build a `/guides` section (same pattern as `/for/...`) and draft guide 1. |
| 6 | Send the first 3 personal invitations (`docs/closed-trial.md`). | Draft guide 2. |
| 7 | Monday-style review of the week's numbers. | Fix what the review found. |
| 8 to 9 | Review guide 2; keep inviting a few people a day. | Draft guide 3 and the "what survives" test-results page (from `docs/test-results.md`). |
| 10 | Check Search Console: are pages indexed? Request indexing for new pages. | Fix any crawl or structured-data issue it reports. |
| 11 to 12 | Run a real scan on a real artwork you own; run the subscription test once the refund is settled. | Prepare the real result screen to replace the generated illustration. |
| 13 | Onboard the first accepted trial participant. | Check Sentry and the admin overview. |
| 14 | Gate 0 review (section 8). | Update this plan. |

### Decision 1: analytics

- **A. GA4 with the existing consent banner.** Free, familiar, the code is ready
  (needs `NEXT_PUBLIC_GA_ID`). Visitors who decline are not measured, so numbers
  are an undercount.
- **B. A privacy-friendly tool** (for example a paid cookieless analytics service).
  Counts more visitors, simpler privacy story, costs money, needs a small code
  change and a Privacy page update.
- **C. Search Console only for now, plus our own database counts** (sign-ups,
  first scans, payments are already in the database). Free and enough to start;
  weak on where visitors come from.

Default: C on day 1, add A on day 2 if the consent banner is acceptable to you.

### Decision 2: search phrases and the first guides

Use Search Console queries, the search box suggestions and the questions artists
ask in communities. Candidate topics (honest, written from real knowledge,
linked to each other and to the product):

1. How to check whether your artwork was reposted without permission.
2. What an invisible watermark is and what survives (use the measured table).
3. Reverse image search for artists: what the common tools do and where they fail.
4. What to do when you find a copy of your artwork (steps; each platform's own
   process; not legal advice).
5. Protecting digital downloads and prints if you sell on Etsy.
6. Photographers: what happens to a photo when it is resized or cropped.
7. Does a watermark stop AI scraping? (only what we know and what we have not tested).
8. How we test: the method behind our numbers.

Each page: one clear question in the title, a direct answer first, original
detail (our measured results are the asset competitors cannot copy), an FAQ
block, internal links to the product and to related pages. No filler.

## 5. Phase 1, weeks 2 to 6: closed trial

Follow `docs/closed-trial.md`. Daily: 2 to 3 personal invitations, replies,
onboarding, check results. Weekly: update the tracker and the numbers.

**Gate 1 (end of week 6): does the product do what we say?**

- **A. Yes:** real copies found, false alarms tolerable, people would pay. Go
  public (phase 2).
- **B. Mixed:** few real copies, or many false alarms, or confusion about the
  limits. Fix the specific cause (matching threshold, copy on the site, onboarding),
  run a second two-week round with new participants, then decide again.
- **C. Weak:** people do not see value. Do not scale outreach or ads. Rethink the
  promise (for example "monitoring and alerts for your shop images" instead of
  "find copies"), talk to the trial users, and re-plan.

## 6. Phase 2, weeks 6 to 12: public launch

- Publish one guide a week; keep improving pages that start to get impressions.
- Share real results (with permission) as short posts and videos.
- Communities: answer questions first, mention the tool where the rules allow.
- Small launch posts (Product Hunt, Indie Hackers) for backlinks and feedback;
  not the main channel.
- Referral: free Deep scan credits for an invited artist who signs up.
- Onboarding emails (welcome, add an artwork, your first scan, plan reminder).

**Gate 2 (end of week 12): where does the funnel leak?** See section 8.

## 7. Phase 3, months 3 to 5: scale what works

- Double the one or two channels that brought paying users; stop the rest.
- Push the yearly plan (better cash flow, fewer cancellations).
- Raise the scan caps in step with usage; review prices against real costs.
- Ads (cap USD 100 a month), only after Gate 2 and only for a channel that
  already showed sign-ups.

### Decision 3: where the ad money goes (USD 100 a month at most)

- **A. Search ads on a few narrow, high-intent phrases** (for example people
  looking for ways to find copies of their art). Pays only when someone searches.
  Cost per click is unknown until tested; start with a small daily cap.
- **B. Pinterest or Instagram ads aimed at artists and Etsy sellers.** Cheaper
  reach, weaker intent; needs good visuals from real results.
- **C. No ads; use the money for a paid tool or a small giveaway of free credits.**
  Right if organic channels are already working.

Test in four weekly steps of about USD 25. Keep one variable at a time. Stop an
experiment if it brings no sign-ups after its budget, or if the cost of a
paying user is higher than what that user pays in the first three months. Never
raise the cap without writing down why.

## 8. Gates and the leak analysis

| Gate | When | Question | If the answer is weak |
| --- | --- | --- | --- |
| 0 | Day 14 | Are search data, tracking and the first content live? | Fix the setup before adding content |
| 1 | Week 6 | Does the product work for real users? | Section 5, options B or C |
| 2 | Week 12 | Where does the funnel leak? | Below |
| 3 | End of month 3 | Subscriptions versus the alarm level | Below the alarm: stop, analyse, change one big thing |

Funnel at Gate 2 (visitors, sign-ups, first scan, paying):

- **Few visitors or sign-ups:** a traffic problem. More guides, more outreach,
  better titles, communities. Ads only if organic traffic converts.
- **Sign-ups but no first scan:** an onboarding problem. Shorten the path to the
  first scan, better emails, better empty states.
- **First scan but no payment:** a value or price problem. Look at what results
  people saw, the credits in Free, plan limits and prices.

## 9. Weekly numbers (fill every Monday)

| Week | Visitors | Sign-ups | First scan | New paying | Cancelled | Active paying | Real copies found (share of results) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Sources: Search Console and analytics for visitors; the admin overview for
sign-ups, scans and plans; Paddle for payments and cancellations; the match
verdict buttons for real copies and false alarms.

## 10. Costs to watch

- Fixed: Railway Pro, SerpApi plan, domain. About USD 45 to 50 a month in
  total at the time of writing (check the real invoices).
- Variable: Google Vision per scan after the free monthly units, SerpApi per Deep
  scan on top of the plan, payment fees on every sale (refunds do not return the
  original fee).
- Ads: at most USD 100 a month, and only through the gates above.

## 11. Risks and how to answer them

| Risk | Answer |
| --- | --- |
| The searches find few real copies | Gate 1 branch B or C; change the promise before spending on traffic |
| SEO takes months to work | Start in week 1; do not rely on it alone; use direct outreach to bridge |
| Scan caps are hit | Raise caps with a budget; watch the admin overview at 80 percent |
| A bad review or a refund wave | Answer honestly and fast; the site already states the limits |
| Outages | `docs/runbook.md`; uptime monitor; short notice to users |
| Time runs out | Cut scope, not the daily rhythm: keep "ship, reach, look" |
