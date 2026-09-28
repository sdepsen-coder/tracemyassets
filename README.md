# TraceMyAssets

An MVP for registering digital artwork, marking it with an invisible watermark,
and reviewing its possible unauthorized use online.

> Find where your artwork may have been used online.
> Review the matches, get the findings, and decide how to proceed yourself.

## Project approach

TraceMyAssets exists to surface technical findings, not to make an automated
legal determination of ownership or infringement.

- Visual similarity does not by itself mean unauthorized use.
- Watermark verification helps associate an image with a registered asset.
- Permission and licensing status is for the user to assess.
- No warning or takedown notice is ever sent without the user's explicit
  review and approval.

## Development status

The project is under active development and should not be assumed
production-ready. The sections below describe the current state.

### Implemented

- User authentication and browser-cookie sessions.
- PNG, JPEG and WEBP upload, with a 25 MiB file-size limit.
- Asset listing, per-user stats, thumbnails, and archive/restore.
- Permanent deletion of an asset (database rows and on-disk files, cascaded
  in FK-safe order) — no archive-first requirement, guarded only by an
  inline confirmation step in the UI.
- pHash visual fingerprinting on upload.
- Invisible watermark embedding for eligible images, with a quality/
  read-back check at generation time.
- Ownership-checked endpoints for downloading the original file and the
  watermarked PNG.
- Monitoring: per-asset scan frequency (daily/weekly/monthly) and alert
  threshold, enforced per plan (see "Plans" below).
- Automated scanning via a background scheduler (APScheduler), plus an
  on-demand "run scan now" endpoint.
- Online candidate discovery via Google Vision Web Detection, with every
  candidate re-verified through the app's own pHash + watermark + ORB
  pipeline before it becomes a match — the discovery provider only ever
  supplies *candidate locations*, never the actual similarity/watermark
  verdict.
- Match review workflow: each match carries a review status (new /
  reviewing / confirmed / dismissed / archived) and optional notes, set by
  the user.
- Plan-based limits (Free / Pro), enforced server-side, not just in the UI.

### Known limitations of the current discovery provider

Google Vision Web Detection is a general web-crawl reverse-image search,
not a marketplace-specific one. In practice this means:

- A matched source page can 404 — the web index isn't real-time, and pages
  move, expire, or were never meant to be permanent.
- The "true" original listing (e.g. the actual marketplace page an image
  was taken from) is not guaranteed to appear among the results.
- Marketplace CDNs (Etsy, Pinterest, etc.) commonly serve resized or
  recompressed variants of an image, which can reduce visual-similarity
  match quality even against a known-source test image.

### Planned

- Marketplace-specific discovery providers (Amazon, Etsy) run alongside
  Google Vision, aggregated per scan and tagged by source, so the most
  infringement-heavy marketplaces get targeted coverage rather than
  relying on general web-crawl discovery alone.
- A "verify and show the watermark" UI.
- Technical finding / evidence reports.
- Draft warning and takedown notices (still requiring explicit user
  approval before anything is sent).
- Product mockup and regional visual-matching research.

## How the invisible watermark works

The current experimental format embeds a verifiable payload into the DCT
coefficients of fully-opaque 8×8 image blocks.

The payload contains:

- Asset ID
- User ID
- Timestamp
- Nonce

Payload integrity uses HMAC. The protected output is saved as a PNG.

This does not place a visible logo or text over the image. Quality checks
are applied to preserve visual quality; the process does modify pixel data.

### Limits

- Small or transparent images may not have enough eligible blocks.
- Insufficient capacity is a supported, handled validation error, not a
  crash.
- Robustness after screenshotting, cropping, resizing, rotation, or lossy
  recompression has not yet been proven.
- A watermark failing to read back does not by itself mean the image is
  unrelated to the registered asset.
- Watermark verification alone is not proof of ownership or infringement.
- The payload's timestamp is not an independent, trusted timestamp.
- The HMAC is not a publicly verifiable digital signature.

## Visual similarity

pHash is used to assess an image's structural similarity to a reference.

Base score for two comparable pHash values:

```text
Similarity score = 100 x (1 - Hamming distance / hash bit length)
```

For example, "83% visual similarity":

- Does not mean an 83% probability of infringement.
- Does not mean 83% of the visual area is identical.
- Is a similarity score produced by the algorithm in use.

Watermark verification and the similarity score are separate results.
A verified watermark does not automatically set the similarity score to 100%.

## Technology

- Python and FastAPI
- SQLAlchemy 2.0, PostgreSQL (via the `psycopg` v3 driver) in production
- Pillow, ImageHash, NumPy, SciPy, OpenCV (for pHash, watermarking, and ORB
  candidate verification)
- APScheduler for the background scan scheduler
- Google Vision Web Detection for online candidate discovery (additional
  marketplace-specific providers planned — see "Planned" above)
- Next.js, React, and TypeScript
- Tailwind CSS

## Plans

Enforced in `app/core/plan_limits.py`, not hardcoded elsewhere:

| Plan | Monitored assets | Scan frequencies | Match source shown |
|---|---|---|---|
| Free | up to 3 | weekly, monthly | No — match strength stays visible, the source site is redacted |
| Pro | up to 25 | daily, weekly, monthly | Yes |

There is also a non-customer-facing **Internal** plan (unlimited, all
frequencies, source shown) with no signup path — it exists only so the
founder's own account can be tested against without tripping the Free
plan's limit during development, assigned by hand with
`scripts/set_user_plan.py`.

## Project structure

```text
backend/
  app/
    api/v1/endpoints/
    crud/
    models/
    schemas/
    services/
  tests/
  requirements.txt
  .env.example

frontend/
  src/
    components/
    lib/
```

## Local development — Windows

These commands assume a development environment whose dependencies and
settings have already been set up; this is not a from-scratch setup guide.

Run the backend and frontend in two separate terminals.

### Backend

From the project root:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level debug
```

Addresses:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

Auto-reload is off in this command. Stop and restart the process after
changing backend code. Do not start a second backend on the same port.

### Frontend

From the project root, in a separate terminal:

```powershell
cd frontend
npm.cmd run dev
```

Default address:

- http://localhost:3000

Use whatever port the terminal reports if it differs.

### Environment settings

- See `backend/.env.example` for the required settings.
- Keep real values in a local `.env` file.
- Do not commit `.env`, secrets, tokens, or user files to Git.
- Keep the watermark secret on the backend only.
- Keep the key used to verify existing files. Rotating it can prevent
  existing watermarks from verifying against the new key.

## Asset API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/assets/stats` | Per-user asset stats |
| GET | `/api/v1/assets` | List the user's assets (`status=active\|archived\|all`) |
| POST | `/api/v1/assets` | Upload an image |
| PATCH | `/api/v1/assets/{asset_id}/archive` | Archive or restore an asset |
| DELETE | `/api/v1/assets/{asset_id}` | Permanently delete an asset and its files |
| GET | `/api/v1/assets/{asset_id}` | Asset detail |
| GET | `/api/v1/assets/{asset_id}/thumbnail` | Thumbnail |
| GET | `/api/v1/assets/{asset_id}/download` | Original file |
| GET | `/api/v1/assets/{asset_id}/download-watermarked` | Protected PNG |
| POST | `/api/v1/assets/{asset_id}/verify-candidate` | Compare an uploaded candidate image against one owned asset |
| GET/PUT | `/api/v1/assets/{asset_id}/monitoring` | Read or update monitoring settings |
| POST | `/api/v1/assets/{asset_id}/scan` | Run a scan for one asset now |

## Matches API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/matches` | List the user's matches (filterable by `review_status`) |
| GET | `/api/v1/matches/summary` | Match counts per review status |
| PATCH | `/api/v1/matches/{match_id}` | Update a match's review status and/or notes |

All of the above require authentication. Single-asset and single-match
operations check ownership.

## Security and privacy

- Never place secrets in client code or file metadata.
- Never serve user files without authorization.
- Never treat metadata as trusted evidence.
- Treat downloaded candidate images and metadata as untrusted data.
- Never send a legal notice without the user's review and explicit approval.

## Product principle

**TraceMyAssets finds, measures, verifies, and documents.
The user decides.**
