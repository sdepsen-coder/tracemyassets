# Test results behind the site copy

The Help, landing and pricing pages only claim what is measured here or
visible in the code. Both tables are pinned by tests, so they cannot drift
silently: if the code changes the result, the test fails and this file and the
site copy must be updated in the same change.

| Table | Test | Run from `backend/` |
| --- | --- | --- |
| 1. Does the invisible watermark survive an edit? | `tests/test_watermark_robustness.py` | `python -m pytest tests/test_watermark_robustness.py -q` |
| 2. Is an edited copy recognised as a copy? | `tests/test_edit_recognition.py` | `python -m pytest tests/test_edit_recognition.py -q` |

## Method

- One synthetic "painting" per test image: random circles and rectangles,
  slightly blurred, 1000 x 1000 px. Three images (generator seeds 3, 5, 8).
- Each image is watermarked with the production `embed_watermark` and saved as
  PNG, exactly like the protected copy a user downloads.
- The protected PNG is then edited (the rows below) and the edited copy is
  checked.
- Table 1 calls `extract_watermark` and asks: does the payload read back with the
  right artwork and user?
- Table 2 calls `verify_candidate_image`, the code every scan uses to decide
  whether a search result is a match (perceptual hash + watermark read + ORB
  keypoints with a RANSAC homography), and records its `overall_signal`.

## Limits of these results (read before quoting anything)

- The images are **synthetic**, not real artwork. Real paintings, photographs
  and illustrations differ (texture, flat colour areas, text, grain). Treat
  the tables as a guide, not a guarantee.
- Only three images, and one watermark strength (the current one). Results
  for other editing tools, other quality settings or combinations of edits
  are unknown.
- **Table 2 measures verification, not discovery.** It says what happens
  once a candidate image is in hand. Whether Google's web detection (Standard
  scan) or Google Lens (Deep scan) lists the page in the first place is outside
  this test and depends on what those services have indexed. Verification is
  the same code for both scan types, so these results are **not** a catch rate
  per scan type, and no such rate is claimed anywhere.
- A match is a technical signal for the owner to review. It is not proof of
  copying or ownership.

## Table 1: invisible watermark after an edit

Result was identical on all three images.

| Edit | Watermark still readable? |
| --- | --- |
| PNG, lossless re-save | Yes |
| WEBP, lossless | Yes |
| JPEG, quality 95 | Yes |
| JPEG, quality 85 | Yes |
| JPEG, quality 70 | **No** |
| JPEG, quality 50 | **No** |
| WEBP, quality 90 | Yes |
| WEBP, quality 75 | **No** |
| Resize to 75% | **No** |
| Resize to 50% | **No** |
| Resize to 25% | **No** |
| Enlarge 2x | **No** |
| Crop to 90% (centred) | **No** |
| Crop to 90% (not on the 8 px block grid) | **No** |
| Crop to 50% (centred) | **No** |
| Rotate 1 degree | **No** |
| Rotate 90 degrees | **No** |
| Mirror | **No** |
| Brightness +20% | **No** |
| Contrast +20% | Yes |
| Black and white | Yes |
| Screenshot-like (50% + JPEG quality 80) | **No** |

Plain reading: the mark survives lossless saving, light JPEG/WEBP compression
(JPEG 85 and above, WEBP 90) and some colour changes. Any resize, any crop,
rotation, mirroring, a brightness change and stronger compression remove it. The
`watermark.py` docstring already says robustness is not established for this
format; this table is the measurement.

Additional colour edits seen in Table 2 (same images): hue shift and sepia tone
also kept the watermark readable.

## Table 2: is the edited copy recognised?

`overall_signal` meanings (from `visual_verification.classify_match`):
**Watermark verified** (our mark was read), **Strong match** and **Possible
match** (flagged for the owner to review), **Weak signal** (not flagged, not
shown as a match).

"Stable" means the same signal on all three images. pHash is the perceptual
hash similarity; inliers are ORB keypoints that agree on one geometric
transformation (more is stronger). Ranges are min to max over the three images.

| Edit of the protected copy | Signal | Flagged? | pHash | ORB inliers |
| --- | --- | --- | --- | --- |
| Same file (PNG) | Watermark verified (stable) | Yes | 100% | 1796 to 1832 |
| Black and white | Watermark verified (stable) | Yes | 100% | 1797 to 1831 |
| Hue shifted | Watermark verified (stable) | Yes | 87.5 to 90.6% | 612 to 688 |
| Sepia | Watermark verified (stable) | Yes | 93.8 to 96.9% | 550 to 618 |
| Resize to 50% | Strong match (stable) | Yes | 100% | 451 to 473 |
| JPEG quality 70 | Strong match (stable) | Yes | 96.9 to 100% | 1196 to 1247 |
| Screenshot-like (50% + JPEG 80) | Strong match (stable) | Yes | 100% | 457 to 488 |
| Brightness +40% | Strong match (stable) | Yes | 90.6 to 93.8% | 433 to 481 |
| Crop to the middle 60% | Strong match (stable) | Yes | 53.1 to 56.2% | 355 to 466 |
| Framed, hung in a room mockup (40% of width) | Strong match (stable) | Yes | 56.2 to 59.4% | 364 to 398 |
| Resize to 25% | **Varies**: weak signal on 2 of 3, possible match on 1 | Sometimes | 100% | 40 to 68 |
| Crop to a 40% corner | **Varies**: possible match on 1 of 3, weak signal on 2 | Sometimes | 46.9 to 53.1% | 99 to 276 |
| Small mockup (25% of width) | **Varies**: weak signal on 2 of 3, possible match on 1 | Sometimes | 50.0 to 59.4% | 118 to 158 |
| Unrelated image | Weak signal on all 3 | **No** | 46.9 to 56.2% | 7 to 29 |
| Unrelated image in a mockup | Weak signal on all 3 | **No** | 43.8 to 53.1% | 16 to 21 |

Plain reading:

- The visual comparison recognised resized (to 50%), recompressed,
  screenshot-like, recoloured, brightened, 60%-cropped and room-mockup copies on
  every test image, including every case where the invisible watermark was
  already gone (Table 1). This is why the product relies on the comparison and
  treats the watermark as one extra signal.
- Small versions (25%), heavy crops (a 40% corner) and small mockups are
  recognised only part of the time. Expect to miss some of these.
- Unrelated images were never flagged. Their raw ORB inlier counts reached 29,
  so the pass/fail decision is made on the inlier ratio, not the count alone
  (unrelated images stayed under 10% inlier ratio in this run).
- Only the unedited, colour-shifted and black-and-white copies were identified
  by the watermark itself; every other row was found by visual comparison.
- RANSAC makes inlier counts move by a few points between runs, so the test pins
  the signal (and a set of allowed signals for the "varies" rows), not exact
  counts.

## Where each statement on the site comes from

| Statement | Source |
| --- | --- |
| Resizing, cropping, rotation and JPEG below quality 85 remove the invisible mark | Table 1 |
| Copies without a readable mark can still be found by comparing how they look | Table 2 |
| Very small or heavily cropped copies may be missed | Table 2 ("varies" rows) |
| Standard scan searches with Google Cloud Vision web detection | `backend/app/services/google_vision_visual_search.py` |
| Deep scan asks Google Lens for exact matches (through SerpApi) | `backend/app/services/serpapi_lens_search.py`, `get_deep_scan_providers` |
| Both scan types verify every result the same way | `backend/app/services/scan_runner.py`, `visual_verification.py` |
| Email alert after a scheduled scan, with a count and a link only | `backend/app/services/scheduler.py`, `alert_emails.py`, `tests/test_alert_emails.py` |
| Daily scans on Pro and Extra, weekly or monthly on Free | `frontend/src/lib/plans.ts`, `scheduler.py` |
| Match source hidden on Free | `backend/app/services/match_presentation.py` |
