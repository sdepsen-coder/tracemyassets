# Next steps (handoff, 2026-10-18)

Plan agreed with the owner. Work top to bottom. Reply to the owner in
Turkish; write everything in the repo in English. Do not invent numbers,
testimonials or capabilities. Every claim on the site must be backed by a
test or a real result.

## A. Launch blockers (owner does these, not code)
- Railway Pro for Postgres and backend-volume backups, then a restore test.
  Until then do not accept real users' artworks.
- Paddle Live: live prices (4 plans, 3 packs), API key, client token,
  webhook destination and secret in Railway only, `PADDLE_ENVIRONMENT=production`,
  payout details. Then update the `/refunds` notice.
- Rotate the SerpApi and Resend keys that were pasted into chats earlier.
- Optional: check "TraceMyAssets" in the UK IPO trademark search.

## B. Copy and honesty work (do now, no real user data needed)
Goal: the landing page explains the product honestly and sells the
monitoring, not only the watermark. Files: `frontend/src/components/landing/
LandingPage.tsx`, `frontend/src/app/pricing/page.tsx`, `help/page.tsx`.

1. Message: keep the headline "Someone is using your art. Find out where."
   Add a line below it that says the product watches the web for you and
   emails you (like Google Alerts for images). Check that email alerts really
   work before promising them.
2. Audience strip: one line naming illustrators, photographers, designers,
   Etsy sellers and digital creators. Keep "artwork" as the main word.
3. Standard vs Deep scan: a short comparison table (same image, resized,
   cropped, recoloured). Fill it ONLY from real test results: run both scans
   on test images (the fake provider is not enough; use the real scan
   pipeline's verification code on edited copies) and record what each
   catches. Say what Standard and Deep search differently.
4. "How the invisible mark works": plain-language explanation plus an FAQ of
   what survives and what does not (PNG vs JPEG, resizing, recompression,
   cropping, screenshots). Write a robustness test first
   (`backend/tests/`, based on `check_watermark.py`), run it, and publish
   exactly what it shows, including the failures.
5. "What we cannot see" box: only public web pages that a search engine
   indexes. Private groups, closed apps and some social networks are out of
   scope. A match is a possible match, never proof of theft.
6. Wording: say "copies" and "unlicensed use", not "stolen". Mild urgency is
   fine ("Find copies before they spread"), no fear claims.
7. Keep the "Illustration with generated artwork — not a real result" note
   until a real example replaces it (see C).

Definition of done: backend tests, `tsc`, `next build` pass; the pages
render at phone width; no number or claim without a source in the repo.

## C. Proof (needs real users)
- Run a real scan on the owner's own artwork (or an artist who agrees in
  writing) and replace the illustration with the real result screen.
- Small closed beta: 5 to 10 artists with free Deep-scan credits; collect
  feedback and written permission before quoting anyone.
- Counters such as "artworks protected" only from the database and only when
  the number is meaningful.
- Reviews (Trustpilot or similar) only real ones.

## D. Later
- Use-case pages (Etsy sellers, photographers, illustrators) for SEO.
- Case studies from beta users.
- Plan-B content: guide pages for "my art was copied, what now".
- Paddle periodic reconciliation, Deep-scan job queue.
- AI-polished complaint letters (backend calls the Claude API; never from
  the browser).
- Not now: a decision-model vendor (Jev from TypeSafe AI) for classification.
  Revisit after launch if a decision step is measurably slow or costly.

## How to start in Claude Code
Open the Code tab, Environment: Local, folder = this repo. Start in Plan
mode with: "Read CLAUDE.md and docs/next-steps.md, then plan section B."
