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

## Commands
- Backend tests (from `backend/`): `python -m pytest tests -q`
  (needs the packages in `requirements.txt`).
- Frontend: `npx tsc --noEmit`, then `npx next build`.
- Before handing over a change: backend tests, `tsc` and `next build` all
  pass; for UI changes also click through it in a browser.

## Git
- Work on a branch, not `main`. Small commits, English messages.
- The owner merges and pushes. Do not push to `main` without being asked.
- Older work was delivered as numbered patch files (`0001`…`0047`, now in
  the git-ignored `archive/` folder) because the cloud session could not
  push. Next free number: 0048.

## Domain rules worth knowing
- Plans: Free $0 (3 artworks, 5 manual Standard scans a month, source links
  hidden, 3 welcome Deep-scan credits once), Pro $12.99/mo or $120/yr (up to
  40 artworks, 10 credits a month), Extra $29.99/mo or $240/yr (up to 100
  artworks, 40 credits a month). Monthly plan credits do not carry over.
- Credit packs (one-time, never expire, spent after plan credits): 10 for
  $4.99, 25 for $9.99, 60 for $19.99.
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
