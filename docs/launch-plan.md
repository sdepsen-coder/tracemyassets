# Launch plan (working document)

Written 2026-10-23, restructured around fallback ladders. The plan is a day-by-day
start plus a set of **ladders**: for each goal there is Plan A, and if it does not
work by a set date there is Plan B, then Plan C, and so on. Every rung has a
trigger (the number or date that tells us to move on), so the decision is made by
data, not by mood. Update it every Monday.

Ground rules (same as the rest of the project):

- Everything on the site is backed by `docs/test-results.md` or by the code.
  No invented numbers, testimonials or capabilities. Say "copies" and
  "unlicensed use", never "stolen", on the site. (Search phrases people type may
  contain other words; use them for research, not for our copy.) No "beta" or
  "coming soon" wording on the site.
- The owner sends every outreach message. No bulk or automated messaging, no
  scraping.
- Secrets stay in Railway only.
- Nothing about a real artist or artwork is shown without written permission.
- Numbers marked *(proposal)* are starting guesses. Replace them with real data
  as soon as there is some.

## 1. The compass

| Level | Number | Meaning |
| --- | --- | --- |
| Target | 100 active paying subscriptions by the end of month 5 | The direction |
| Floor | about 50 to 70 | Still a good result: the product and the direction are right |
| Alarm | fewer than about 15 at the end of month 3 *(proposal)* | A product or channel problem: stop adding effort to the same thing and walk the ladders below |

Assumptions behind the target (not measured yet): roughly 1,000 to 3,300 sign-ups
if 3 to 10 percent of sign-ups end up paying, plus extra gross sign-ups to cover
cancellations. That is about 50 to 150 new sign-ups a week at full speed for 3 to
5 months. Replace with the real conversion rates as soon as the trial gives them.

## 2. Inputs to fill in (owner)

| Question | Answer |
| --- | --- |
| Hours per week available | unknown |
| Budget (ads cap USD 100 a month; tools) | USD 100 max for ads |
| Existing audience (followers, email list, artists you know) | unknown |
| Languages (site is English; Turkish sellers can be reached directly) | English site |

## 3. How the ladders work

- **Rungs are layered, not swapped.** Moving to the next rung means adding it;
  keep the earlier ones running as long as they bring anything. SEO in
  particular compounds slowly and should keep going while B and C run.
- **One check date per rung.** On that date compare the number with the
  trigger. Write the result in the weekly table (section 9) and the decision in
  one line below the ladder.
- **Change one thing at a time**, so we know what worked.
- **If the last rung fails, stop and re-plan** with the owner: do not keep
  spending on the same thing.

Operating rhythm. Daily (60 to 120 minutes, adjust to the hours above), in this
order: (1) ship one thing that moves a metric, (2) reach a few people directly,
(3) look at the dashboard for 5 minutes (Sentry, uptime, admin overview, the weekly
sheet). Weekly (Monday, 20 minutes): fill section 9, check the ladders, pick the
single priority of the week.

## 4. Ladder 1: getting people to the site (traffic and sign-ups)

| Rung | What | Check date | Trigger to add the next rung | If it works |
| --- | --- | --- | --- | --- |
| **A. Search and guides** | Technical SEO (section 6), guides, the `/for/...` pages, Search Console | End of week 6 | Fewer than about 20 sign-ups a week from all sources *(proposal)* | Keep publishing one guide a week; improve pages that gain impressions |
| **B. Direct reach and communities** | Personal invitations (closed-trial plan), answers in artist and Etsy-seller communities, 5 to 10 small creators, referral credits | End of week 10 | Weekly sign-ups still below half of the pace the target needs *(proposal)* | Double the one community or contact route that brings sign-ups; ask each happy user for one introduction |
| **C. Paid ads (cap USD 100 a month)** | Four weekly experiments of about USD 25, one channel each (see section 8) | After the budget is spent | Cost of one paying user above what that user pays in their first three months | Keep only the channel that passes; raise spend in small steps and write down why |
| **D. Change the angle** | A different promise or audience (for example "monitoring and alerts for your shop images", or one niche such as Etsy digital sellers) | When rung C fails | none: this is the last rung, so re-plan with the owner | Rebuild the landing and the guides around the new angle |

## 5. Ladder 2: does the product do what we say (closed trial, then public)

Follow `docs/closed-trial.md`. Check date: end of week 6.

| Rung | Situation | Action | Trigger to move on |
| --- | --- | --- | --- |
| **A. Proven** | Real copies are found for a clear share of participants, false alarms are tolerable, people say they would pay *(thresholds: write them before the trial starts)* | Open to the public (Ladder 1 gets its traffic) | none |
| **B. Mixed** | Few real copies, or many false alarms, or confusion about the limits | Fix the named cause (matching threshold, site copy, onboarding), run a second two-week round with new participants | Second round still mixed |
| **C. Narrow the promise** | Copies are found too rarely to sell "find copies" | Sell what works today: scheduled scans, email alerts, side-by-side review; say plainly what it cannot find | People still do not see value |
| **D. Change the sources or rethink** | The searches themselves are the limit | Look at other legitimate search sources and at costs; or rethink the product with what the trial users actually asked for | none: re-plan with the owner |

## 6. Phase 0, weeks 0 to 2: foundations, SEO first

Search needs time to start working, so the technical SEO and the first content go
first; outreach for the closed trial runs in parallel.

### State of the site (checked on the live site, 2026-10-23)

Done and live:

- Titles and descriptions per page, canonical links, `robots.txt`, a sitemap, a
  social-preview image, structured data (Organization, WebSite,
  SoftwareApplication on the home page; FAQ on Help; WebPage and BreadcrumbList on
  `/for/...`; Article and BreadcrumbList on guides).
- The home and about pages now send real content to crawlers (they used to send
  only "Checking your session..."); `www` redirects to the main address; the word
  "beta" is gone from the site.
- Search Console has the site, the sitemap is submitted, and indexing was
  requested for the first pages.

Open:

- No analytics and no event tracking for sign-up, first artwork, first scan or
  purchase (see Ladder 5).
- Core Web Vitals not measured (run PageSpeed Insights on the home page, a
  `/for/...` page, a guide and Help, mobile and desktop).
- Only a handful of public addresses, and one guide.

### SEO checklist for this site

Adapted from the generic SaaS SEO checklist. Left out because they do not apply:
hreflang (English only), redirects for changed URLs (none changed), integrations
and "alternatives" pages (later, if ever), behaviour-recording tools (privacy),
image-format work (almost no raster images).

| Item | State | Action |
| --- | --- | --- |
| HTTPS, one main address | Done | none |
| Sitemap, robots.txt, canonical links | Done | Add every new guide; per-page dates are maintained by hand |
| Unique title and description per page | Mostly done | Review every public page; make the `/for/...` titles more specific |
| One H1 and a clear outline | Done on content pages | Re-check after each new page |
| Server-rendered content | Done | none |
| Private pages noindex | Done | none |
| Structured data | Done for the current pages | Validate each new page in the Rich Results Test |
| Social image | Done (one image) | A separate image per guide later |
| Real 404 | Done | none |
| Search Console, Bing Webmaster | Search Console done | Bing: import from Search Console |
| Analytics and events | Open | Ladder 5 |
| Core Web Vitals | Open | Owner measures; fix what the report names |
| Internal links | Partial | Footer link to guides done; every guide links to the product and to two other guides |
| Content that answers real searches | Started | Guide topics below |
| Free helpful tool | Not started | Only if honest and useful; after the first guides |

### Guide topics (in order)

1. What an invisible watermark survives: our measured results (published).
2. How to check whether your artwork was reposted without permission (published).
3. What to do when you find a copy of your artwork (published; each platform's own process; not legal advice).
4. Reverse image search for artists: what the common tools do and where they fail.
5. Protecting digital downloads and prints if you sell on Etsy.
6. Photographers: what happens to a photo when it is resized or cropped.
7. Does a watermark stop AI scraping? (only what we know and have not tested.)
8. How we test: the method behind our numbers.

Each page: one clear question in the title, a direct answer first, original detail
(our measured results are what competitors cannot copy), internal links to the
product and to related guides, no filler.

### Days 1 to 14

| Day | Owner | Claude |
| --- | --- | --- |
| 1 | Search Console: request indexing for the main pages; Bing Webmaster import | Audit of live pages (done) |
| 2 | Choose analytics (Ladder 5) and create the account | Add the conversion events |
| 3 | Review the SEO fixes on your phone | SEO code pass, `/guides` section and guide 1 (done) |
| 4 to 5 | Read and correct guide 2; first 3 personal invitations | Draft guide 2 |
| 6 to 7 | Read guide 3; Monday review | Draft guide 3; fix what the review found |
| 8 to 9 | Keep inviting a few people a day | Draft guide 4 and the method page |
| 10 | Search Console check: pages indexed? | Fix any crawl or structured-data issue |
| 11 to 12 | Real scan on a real artwork you own; subscription test once the refund is settled | Real result screen to replace the generated illustration |
| 13 | Onboard the first trial participant | Check Sentry and the admin overview |
| 14 | Review all ladders | Update this plan |

## 7. Ladders 3 to 6: after sign-up

### Ladder 3: sign-ups who never run a first scan

| Rung | Action | Trigger to move on |
| --- | --- | --- |
| A. Shorter path | Fewer steps to the first scan; clearer first screen; onboarding emails (welcome, add an artwork, your first scan) | Fewer than about 40 percent run a first scan within 7 days *(proposal)*, checked after 4 weeks of real sign-ups |
| B. In-app guidance | A guided first scan, helpful empty states, a short "what to expect" note about limits | Same check two weeks later |
| C. A personal touch | A short personal email to each of the first 50 sign-ups asking what stopped them | Same check; if still low, ask whether the free plan is too small (Ladder 4 rung D) |

### Ladder 4: first scan done but no payment

| Rung | Action | Trigger to move on |
| --- | --- | --- |
| A. Clearer value and prompts | Pricing page clarity; upgrade prompts exactly where a limit is hit | Fewer than about 3 percent of active users pay after 6 weeks *(proposal)* |
| B. Lower the first step | Make the USD 4.99 credit pack the easy first purchase; show what a Deep scan found before asking for payment | Same check, 4 weeks later |
| C. Time-limited offer | A one-off launch offer or an annual-plan incentive (only with a written end date; never a fake countdown) | Same check |
| D. Rework plans and prices | Use real cost data (provider cost per user, Paddle fees) and what trial users said they would pay | none: re-plan with the owner |

### Ladder 5: measuring (analytics)

| Rung | Option | Move on when |
| --- | --- | --- |
| A. Google Analytics 4 with the existing consent banner | Free; set `NEXT_PUBLIC_GA_ID`; undercounts visitors who decline | The undercount makes the numbers unusable |
| B. A privacy-friendly analytics service | Counts more visitors; costs money; needs a small code change and a Privacy page update | none |
| C (fallback) | Search Console plus our own database counts (sign-ups, first scans, payments are already in the database) | Use this from day 1 while the others are set up |

### Ladder 6: platform problems

| Problem | A | B | C |
| --- | --- | --- | --- |
| Payments fail or a webhook does not arrive | Sentry and the Paddle notification log (`docs/runbook.md`) | Paddle support with the transaction number | Grant the credits or plan by hand in the admin screen and note it in the tracker |
| Hosting incident | Railway status page; wait if services still run | Backup restore (`docs/runbook.md`) | A short notice to users; do not change variables during an incident |
| Scan caps reached | Raise the caps with a budget (admin overview warns at 80 percent) | Pause the free credits for new sign-ups for a few days | Tell affected users plainly and give back credits |

## 8. Ads (cap USD 100 a month), only after rung C of Ladder 1

Four weekly experiments of about USD 25. One channel and one variable at a time.
Stop an experiment if its budget brings no sign-ups, or if the cost of a paying
user is above what that user pays in their first three months. Never raise the cap
without writing down why.

| Rung | Channel | When to move on |
| --- | --- | --- |
| A. Search ads on a few narrow phrases | People who look for ways to find copies of their art; pays only when someone searches | No sign-ups after the budget |
| B. Pinterest or Instagram ads aimed at artists and Etsy sellers | Cheaper reach, weaker intent; needs good visuals from real results (with permission) | No sign-ups after the budget |
| C. No ads | Use the money for a paid tool or a free-credit giveaway; right if organic channels already work | none |

## 9. Weekly numbers (fill every Monday)

| Week | Visitors | Sign-ups | First scan | New paying | Cancelled | Active paying | Real copies found (share of results) | Ladder and rung now | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Sources: Search Console and analytics for visitors; the admin overview for
sign-ups, scans and plans; Paddle for payments and cancellations; the match
verdict buttons for real copies and false alarms.

## 10. Costs to watch

- Fixed: Railway Pro, SerpApi plan, domain. About USD 45 to 50 a month in total at
  the time of writing (check the real invoices).
- Variable: Google Vision per scan after the free monthly units, SerpApi per Deep
  scan on top of the plan, payment fees on every sale (refunds do not return the
  original fee).
- Ads: at most USD 100 a month, and only through Ladder 1 rung C.

## 11. Risks

| Risk | Where the answer is |
| --- | --- |
| The searches find few real copies | Ladder 2 rungs B to D |
| SEO takes months to work | Ladder 1: start in week 1, add rung B in parallel from the first invitations |
| Scan caps are hit | Ladder 6 |
| A bad review or a refund wave | Answer honestly and fast; the site already states the limits |
| Outages | Ladder 6 and `docs/runbook.md` |
| Time runs out | Cut scope, not the daily rhythm: keep "ship, reach, look"; if needed pause one rung and move the check date, written in the plan |
