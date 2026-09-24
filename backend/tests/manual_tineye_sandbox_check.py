"""
Manual, zero-cost check that the TinEye integration talks to their API
correctly -- NOT part of the automated test suite (not named test_*.py
on purpose: it needs real internet access and the optional pytineye
package, neither of which belong in CI).

What this proves: the request/response wiring in
app.services.tineye_visual_search works end-to-end.

What this does NOT prove: whether TinEye would actually find real
copies of your own artwork, or what that would cost at real volume.
The public sandbox key always returns TinEye's fixed "melon cat" demo
match, regardless of which image you submit -- see
https://help.tineye.com/article/182

Run it yourself (this needs real internet access this container does
not have):

    pip install pytineye
    python tests/manual_tineye_sandbox_check.py path/to/any/image.jpg

Next real step, when you're ready to spend money on this (see Bolum 1
of the master prompt -- this is a "stop and ask" decision, not one
Claude makes for you): sign up at https://api.tineye.com/ and buy the
smallest bundle to test against your own artwork with real results.
"""

from __future__ import annotations

import sys

from app.services.tineye_visual_search import TineyeVisualSearchProvider


def main() -> None:
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <path-to-image>")
        raise SystemExit(1)

    image_path = sys.argv[1]
    provider = TineyeVisualSearchProvider()  # uses the public sandbox key

    candidates = provider.find_candidates(
        asset_id=0,
        asset_title="sandbox check",
        reference_original_path=image_path,
        reference_watermarked_path=None,
    )

    print(f"TinEye sandbox returned {len(candidates)} candidate(s):\n")

    for candidate in candidates:
        print(f"- source: {candidate.source_name}")
        print(f"  image:  {candidate.candidate_image_url}")
        print(f"  page:   {candidate.candidate_page_url}")
        print()

    print(
        "Reminder: this is always TinEye's fixed sandbox sample, "
        "not a real search of your image."
    )


if __name__ == "__main__":
    main()
