"""
Manual check that the Google Vision service-account setup works --
NOT part of the automated test suite (needs real internet access and
real credentials, neither of which belong in CI).

Unlike the TinEye sandbox script, this calls the real Vision API with
your real service account -- it counts against your free 1,000/month
quota (one query), so it will not cost anything by itself, but it is
a real call, not a fixed demo response.

Run it yourself (this needs real internet access this container does
not have):

    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\key.json"
    python tests/manual_google_vision_check.py path\\to\\any\\image.jpg
"""

from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sys

from app.services.google_vision_visual_search import (
    GoogleVisionWebDetectionProvider,
)


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <path-to-image>")
        raise SystemExit(1)

    image_path = sys.argv[1]

    try:
        provider = GoogleVisionWebDetectionProvider()
    except Exception as exc:  # noqa: BLE001 -- surface any setup error
        print("Could not initialize the provider.")
        print(
            "Check that GOOGLE_APPLICATION_CREDENTIALS points at your "
            "downloaded service account JSON file."
        )
        print(f"Details: {exc}")
        raise SystemExit(1) from exc

    candidates = provider.find_candidates(
        asset_id=0,
        asset_title="sandbox check",
        reference_original_path=image_path,
        reference_watermarked_path=None,
    )

    print(f"Google Vision Web Detection returned {len(candidates)} page(s):\n")

    for candidate in candidates:
        print(f"- source: {candidate.source_name}")
        print(f"  image:  {candidate.candidate_image_url}")
        print(f"  page:   {candidate.candidate_page_url}")
        print()

    if not candidates:
        print(
            "No pages found for this image -- that's expected for an "
            "image that has never appeared online before. Try a well-"
            "known photo (e.g. a famous painting or logo) to confirm "
            "the pipeline itself is working."
        )


if __name__ == "__main__":
    main()
