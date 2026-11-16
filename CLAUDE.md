# TraceMyAssets — working notes for Claude

TraceMyAssets registers digital artworks, marks them with an invisible
watermark and searches the web for possible copies. Owner: Semsi (architect,
sole trader). Live at https://tracemyassets.com. Payments run on Paddle
(sandbox for now).

## How to work with the owner
- Talk to the owner in Turkish. Write everything in the project (code,
  comments, commit messages, docs, this file) in English.
- Decide and proceed on code, architecture and roadmap without asking at
  every step, and give honest technical opinions. Ask first before: git
  commit or push, spending real money, sending anything external on the
  owner's behalf (emails, support tickets, store listings).
- Keep answers short and plain. Say what changed and what the owner must do.
- Project notes (status updates, launch checklist, decisions, Paddle setup)
  live in the claude.ai Project "TRACEMYASSETS". Read the latest
  `status-update-*` and `launch-checklist` there before planning work.

## Secrets (hard rule)
- Secrets live only in Railway variables. Never ask for, accept, print or
  commit API keys, DSNs, webhook secrets, client tokens or database URLs.
  If the owner pastes one by mistake, say so and ask them to rotate it.
- Never change `WATERMARK_SECRET_HEX` / `WATERMARK_SECRET_B64`: every
  artwork's invisible watermark derives from it.
- Do not set `ANTHROPIC_API_KEY` locally (Claude Code must use the
  subscription, not API billing).

## Layout
- `backend/` FastAPI + SQLAlchemy. `app/api/v1/endpoints/` routes,
  `app/services/` logic, `app/models/`, `tests/`. Procfile runs
  `uvicorn app.main:app`. Schema comes from `Base.metadata.create_all`:
  new tables only, never new columns on an existing table.
- `frontend/` Next.js (app router, Tailwind). `src/lib/api.ts` is the API
  client, `next.config.js` proxies `/api/v1/*` to the backend.
- Hosting: Railway. Backend in project `imaginative-wisdom` (volume at
  `/app/storage` holds the artwork files). Frontend and Postgres in
  `supportive-warmth`. Backups need Railway Pro; until then take a manual
  `pg_dump` before risky changes.

## Look and feel
- Cyber dark theme (dark is the default, `.light` switches it): colours are
  CSS variables in `frontend/src/app/globals.css`; text and headings Plus
  Jakarta Sans, labels JetBrains Mono. Use the variables, not hex codes.
- Public pages share `SiteHeader` (with the phone menu) and `SiteFooter`.
- The icon font is served from our own domain
  (`frontend/public/fonts`). After using a new icon run
  `node scripts/icons.mjs --fetch` in `frontend/` and commit the two font
  files; the build fails if the font lacks an icon. Nothing may load from
  Google or another third party before the visitor accepts the cookie banner
  (the Privacy Policy promises this).

## Commands
- Backend tests (from `backend/`): `python -m pytest tests -q`
  (needs the packages in `requirements.txt`).
- Frontend: `npx tsc --noEmit`, then `npx next build`.
- Before handing over a change: backend tests, `tsc` and `next build` all
  pass; for UI changes also click through it in a browser.

## Git
- Work on a branch, not `main`. Small commits, English messages.
- The owner merges. Push a work branch only when the owner asks (the push
  ban in `.claude/settings.json` was lifted on 2026-11-15); never push to
  `main`. The settings pre-approve tests, `tsc`, `next build`, `git add`
  and `git commit`. Personal overrides go in `.claude/settings.local.json`
  (git-ignored).
- Older work was delivered as numbered patch files (`0001`…`0047`, now in
  the git-ignored `archive/` folder) because the cloud session could not
  push. Next free number: 0050.

## What to work on next
See `docs/next-steps.md` (agreed plan, launch blockers and the copy and
honesty work).

## Domain rules worth knowing
- Plans: Free $0 (3 artworks, 10 manual Standard scans a month, source links
  hidden, 5 welcome Deep-scan credits once), Pro $12.99/mo or $120/yr (up to
  40 artworks, 40 manual Standard scans, 15 Deep credits a month), Extra
  $29.99/mo or $240/yr (up to 100 artworks, 100 manual Standard scans, 100
  Deep credits a month). Monthly plan credits do not carry over. Raised on
  2026-11-16 (was 5/3, 30/10, 100/40); prices unchanged, so no Paddle change.
- Credit packs (one-time, never expire, spent after plan credits): 10 for
  $4.99, 25 for $9.99, 60 for $19.99.
- Each finished scan keeps why its candidates did or did not become matches
  (counts only, no addresses) in `scan_diagnostics`; the admin shows it under
  each artwork. Scans from before 2026-11-16 and failed scans have none.
- Feedback reward: written feedback of 60+ characters earns 2 Deep credits
  once per account (ledger reason `feedback`), only after a finished scan.
  It must never depend on what the feedback says (no sentiment check, no
  public-review condition): rewarded reviews are restricted in the UK and US.
  Public reviews and quotes are asked for separately, with permission and no
  reward. Every new ledger reason must also be added to `CreditEntryRead` in
  `endpoints/credits.py` (a test covers it), or that user's balance 500s.
- Credits are an append-only ledger (`CreditEntry`). A Deep scan costs 1
  credit and is refunded if the search could not run.
- Paddle: the webhook (`POST /api/v1/billing/webhook`) verifies the
  signature, ignores repeated event ids, and recognises prices by amount and
  interval, not by price id. Refunds and chargebacks take back only unspent
  pack credits.
- Paid searches have daily and monthly caps (SerpApi and Google Vision);
  the admin overview warns at 80 percent.
- Admin pages are hidden (404) for non-admins and need a recent Google
  sign-in. `ADMIN_EMAILS` lists the admins.
- Email goes through the Resend HTTPS API (Railway blocks SMTP).
- Sentry reports backend errors only and never sends cookies, IP addresses,
  request bodies or user details.

## Before going live with payments
See `launch-checklist` in the project notes: create the live Paddle prices
(4 plans, 3 packs), live API key, client token and webhook secret (Railway
only), set `PADDLE_ENVIRONMENT=production`, update the `/refunds` notice.
