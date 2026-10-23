# Closed trial plan

A small, invitation-only trial with 5 to 10 artists before any public launch.
The goal is evidence, not revenue: do the scans find real copies of real
artwork, how many results are false alarms, and what would people do with the
results. Everything the site says about finding copies should be backed by what
this trial shows.

Rules that apply throughout:

- The owner writes and sends every invitation, one person at a time. No
  automated or bulk messaging, no scraping of contact details.
- Only say what the product does today. No promised results, no "beta" or
  "coming soon" wording on the site (the invitation can say it is a small trial).
- Nothing about an artist (name, artwork, results) is quoted or shown anywhere
  without their separate written permission.
- Keep personal data to the minimum the trial needs and delete it when it ends
  (see "Data handling").

This is a plan, not legal advice. Have the consent text read by someone who can
advise on UK GDPR before sending it, and keep it consistent with the Privacy page.

## 1. What to find out

1. **Find rate in practice.** For each participant's artwork, how many results
   come back from Standard scans and from Deep scans, and how many of those are
   real copies. We have no per-scan-type catch rate today and must not quote one.
2. **False alarms.** How many results are not a copy of the artwork at all.
3. **Usefulness.** Did the person learn something they did not know? Did they
   act on a result (report, message, ignore)?
4. **Understanding.** Do people understand the limits (invisible mark is
   fragile, only indexed public pages, a match is a possible match)?
5. **Willingness to pay**, and for which plan. Ask, do not assume.
6. **Cost reality.** Provider calls per participant per week (the admin overview
   shows Vision and SerpApi usage), to check the cost estimates and the daily and
   monthly caps.

## 2. Who to invite

Aim for variety, 5 to 10 people:

- Illustrators or digital artists who publish work online.
- Etsy sellers of digital downloads or prints (including Turkish sellers).
- One or two photographers.

Good fit: at least 3 artworks already public (so there is something to find),
willing to give honest feedback, and willing to review results themselves.
Avoid friends who will only say it is great.

## 3. What each participant gets

Decide before inviting (owner's call): for example the Pro plan set by hand in
the admin screen for the trial period, plus Deep scan credits. A plan set by hand
does not expire by itself: write the end date in the tracker and switch the
account back to Free on that date. Say clearly that there is no charge and no
card is needed during the trial.

## 4. Tracker (spreadsheet)

One row per person. Keep it in a private sheet, not in the repo.

| Column | Notes |
| --- | --- |
| Name or handle | As they gave it; no extra personal data |
| Contact | One channel (email or the platform they replied on) |
| Type | Illustrator / Etsy seller / photographer / other |
| Where public | Shop or portfolio (their own link) |
| Invited on | Date; who sent it |
| Status | Invited / replied / applied / consent received / account ready / scanning / feedback received / finished / declined |
| Consent on file | Date and where the written reply is kept |
| Account email | The email they sign up with |
| Plan and credits given | What was set by hand, and the end date |
| Artworks added | Count |
| Scans run | Standard / Deep |
| Results | Real copy / false alarm / own listing / unclear (from the match verdict buttons, see section 6) |
| Quote or screenshot allowed | Yes / no, from the separate permission |
| Notes | Facts only |

## 5. Process and timing (rough)

1. Week 1: write 15 to 25 personal invitations, expecting a minority to reply.
2. On reply: send the application form and the consent text (section 7).
3. When consent is back: create or confirm the account, set plan and credits,
   send a short "how to start" note (add 3 or more artworks, run one Standard and
   one Deep scan, review the matches, use the feedback buttons).
4. Weeks 2 to 4: they use it; the scheduled scans run on their own. Check Sentry
   and the admin overview for problems every few days.
5. End of week 4: send the short survey (section 8), collect results, switch
   accounts back to Free (or to a paid plan if they choose), delete what is not
   needed.
6. Decide: see section 9.

## 6. Measuring results with what already exists

The Matches page has verdict buttons: confirm as useful, and "It's my work, but
not worth acting on", "It looks similar, but it's a different artwork", "It has
nothing to do with my artwork". Ask participants to press them on every result.
The admin feedback tab then lists the verdicts. Count per participant and per
scan type (a Deep scan tags its matches).

Treat the verdicts as the participant's opinion of each result. Where a result
looks like a real copy, ask them to tell you what they found when they opened the
page, so the count of real copies is the person's own judgement, not ours.

## 7. Application form and consent

Use any simple form tool. Ask only:

1. Name or handle (how you want to be addressed).
2. Email you will use for your TraceMyAssets account.
3. What kind of work you make, and where it is public (links to your own shop or
   portfolio).
4. How many artworks you would add (3 to 10 is fine).
5. Do you agree to the points below? (one required checkbox per point)

Consent points (plain language):

- I upload only work I own or have the right to use here.
- I understand that, to search, an image of my artwork is sent to the search
  services TraceMyAssets uses (named in its Privacy Policy), and that my original
  is never published.
- I understand the service finds possible matches, not proof, and can miss
  copies. I will review results myself and decide what to do; TraceMyAssets does
  not contact anyone for me.
- I will give honest feedback (a short survey after the trial) and may press the
  feedback buttons on results.
- The trial is free; nothing is charged. I can leave at any time and ask for my
  account and data to be deleted.
- Separate and optional: I allow TraceMyAssets to quote my feedback and show a
  screenshot of my results on its website, with / without my name (choose).
  Without this permission nothing about me or my work is shown.

Keep the replies as the written record. Never ask for card details or passwords.

## 8. Short survey after the trial (5 to 8 questions)

1. How many of the results were real copies of your work? (number)
2. How many were not? (number)
3. Did you learn about a copy you did not know of? What did you do about it?
4. What did you expect the watermark to do, and did what you read about its
   limits match your experience?
5. What was confusing or missing?
6. Would you keep using it? Would you pay for it, and what would you expect to
   pay per month? (free text, no price shown to avoid anchoring)
7. Who else would want this?

## 9. Deciding what happens next

Write down the thresholds before the trial starts, so the result decides, not
hope. Questions to answer with the numbers:

- Do real copies turn up often enough that people see value, and for which scan
  type?
- Are false alarms low enough not to annoy? If not, what is the cause (search
  results, the matching threshold) and is it fixable?
- Does anyone say they would pay, and for what?
- Do provider costs per participant match the estimates and fit the caps?

Possible outcomes: open to the public as is; fix specific problems and run a
second round; change the pricing or the plans; or rethink the promise on the
landing page. Update `docs/test-results.md` and the site copy only with what the
trial really showed.

## 10. Data handling

- The tracker holds personal data (names, contact, work). Keep it private,
  minimal and out of the repo; delete rows and contact details when the trial and
  follow-up end.
- Written consent replies are kept only as long as needed to show permission.
- If a participant leaves, switch their account back to Free, and delete their
  account and data on request (the app has a delete-account function).
- Do not paste any participant data, passwords or provider keys into chats.
