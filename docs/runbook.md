# Runbook: when the site misbehaves

Short checklists for the owner. No secrets belong in this file or in any chat:
passwords, tokens and database URLs stay in Railway variables (see `CLAUDE.md`).
Statements about Railway come from its docs or from what we saw on 2026-10-20
and 2026-10-21; check the current docs before relying on them.

## 1. First five minutes (any problem)

1. Is it just you? Open the site in a private window. A stale session cookie
   makes pages that need the database fail while the public pages still load.
2. Railway status: https://status.railway.com . During a platform incident new
   builds (and sometimes the dashboard, API, CLI and Console) are unavailable.
   Services that are already running usually keep running.
3. Sentry (org `tracemyassets`, project `python-fastapi`): the newest issue
   usually names the cause. Look at the last line of the exception.
4. What changed last? A variable edit, a deploy or a password change is the
   likeliest cause. Undo that first.
5. Do not redeploy, restore or delete anything while you are unsure. The data
   is not at risk from waiting.

## 2. Symptom table

| Symptom | Most likely cause | First check |
| --- | --- | --- |
| Public pages load, sign-in returns 500, banner "We could not check your sign-in..." | Backend cannot log in to Postgres | Sentry: `password authentication failed` or `connection failed` |
| Everything is down | Railway incident, or the backend crashed | status.railway.com, then the backend deployment logs |
| Scans never start or emails stop | Scheduler job failing (it runs every 15 minutes) | Sentry issues from `app.services.scheduler` |
| Dashboard or Console does not open (WebSocket failed) | Railway incident, or your network | status.railway.com, then another browser |

## 3. Database password: do not change it casually

What went wrong on 2026-10-20: the Postgres password variables were edited in
Railway. Postgres reads `POSTGRES_PASSWORD` only when the database is first
created, so the real role password and the variables drifted apart and the
backend could no longer sign in.

If the password really must change (for example after it leaked):

1. Take a fresh dump first (section 5) and keep it somewhere private.
2. Check what the backend uses: its `DATABASE_URL` should be a reference to the
   Postgres service variable (and the internal address), not a pasted copy. If
   it is a pasted copy, change it to a reference first, in its own deploy.
3. Do it at a quiet time, with Railway healthy (no open incident).
4. Change the role password inside the database (Console: `psql -U postgres -d
   railway`, then `\password postgres`) and make the service variables hold the
   same value. Use Railway's own regenerate action where it exists rather than
   hand-editing `POSTGRES_PASSWORD`.
5. Redeploy the backend, then check sign-in and Sentry.
6. If it breaks, put the previous value back; the dump is the safety net.

## 4. Watching the site

- Sentry already reports backend errors by email.
- Add an uptime monitor (a free tier of any monitoring service is enough). Check
  two URLs every minute or so: `/` (the frontend) and `/api/v1/auth/providers`
  (the backend, no sign-in needed). Send alerts to your phone.
- Spending: in the Railway workspace usage page keep a soft limit (email) and a
  hard limit (services go offline when it is reached). Set the hard limit well
  above a normal month so it only trips on a runaway bill.

## 5. Backups

- Railway Pro: scheduled backups per volume (daily, weekly, monthly). The
  Postgres volume and the backend volume (`/app/storage`, the artwork files)
  each need their own schedule.
- A restore stages a new volume and only takes effect when you press Deploy.
- Extra copy outside Railway (database only; the dump contains user data, so
  store it privately and delete old ones). The public proxy address from the
  Postgres service variables is needed from your own computer; keep it in an
  environment variable, never in chat or files:

  ```powershell
  docker run --rm -e DB_URL -v ${PWD}:/out postgres:18 sh -c 'pg_dump --no-owner --format=custom -f /out/tma-backup-DATE.dump "$DB_URL"'
  ```

- Test a restore into a throwaway local database now and then:
  `docker run -d --name tma-restore-test -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:18`,
  copy the dump in, `pg_restore -U postgres -d postgres --no-owner`, list tables
  with `\dt`, then `docker rm -f tma-restore-test`.

## 6. Telling users

When the problem is on our side or at the host and lasts more than a few minutes,
say so briefly on the Support page or by email: what is affected, that it is being
worked on, and when to check again. Do not promise a fix time you do not know.
