"""
Example real-provider implementation -- NOT wired into the scan endpoint.

This shows how a real discovery provider plugs into the
VisualSearchProvider interface (see app.services.visual_search_provider)
without changing anything else in the scan pipeline: it only returns
candidate locations, never a similarity score or watermark verdict --
that still comes from our own verify_candidate_image() pipeline.

Requires the official TinEye client:
    pip install pytineye

Not added to requirements.txt because it is provider-specific and
optional -- only install it once a real TinEye account (or another
provider) has been chosen. See the module docstring in
tests/manual_tineye_sandbox_check.py for a zero-cost way to confirm
this integration talks to TinEye correctly before spending anything.
"""

from __future__ import annotations

from app.services.visual_search_provider import DiscoveredCandidate

# TinEye's own public sandbox key. It always returns results for a
# fixed sample image ("melon cat"), regardless of what you search for.
# Useful only to prove the integration code works -- never for real
# match quality. See: https://help.tineye.com/article/182
TINEYE_SANDBOX_API_KEY = "6mm60lsCNIB,FwOWjJqA80QZHh9BMwc-ber4u=t^"


class TineyeVisualSearchProvider:
    """
    Discovery provider backed by the TinEye API.

    Pass a real, paid api_key to get real results. Passing
    TINEYE_SANDBOX_API_KEY (the default) always returns TinEye's fixed
    sandbox sample -- safe to leave wired up while testing, but it will
    never find anything about the user's actual artwork.
    """

    name = "tineye"

    def __init__(self, api_key: str = TINEYE_SANDBOX_API_KEY) -> None:
        self.api_key = api_key

    def find_candidates(
        self,
        *,
        asset_id: int,
        asset_title: str,
        reference_original_path,
        reference_watermarked_path,
    ) -> list[DiscoveredCandidate]:
        # Imported lazily so importing this module doesn't require
        # pytineye to be installed unless this provider is actually
        # selected.
        from pytineye import TinEyeAPIRequest

        api = TinEyeAPIRequest(
            api_url="https://api.tineye.com/rest/",
            api_key=self.api_key,
        )

        with open(reference_original_path, "rb") as handle:
            response = api.search_data(data=handle.read())

        return [
            DiscoveredCandidate(
                source_name=match.domain or "TinEye",
                source_url=match.backlinks[0].backlink
                if match.backlinks
                else None,
                candidate_image_url=match.image_url,
                candidate_page_url=match.backlinks[0].url
                if match.backlinks
                else None,
                candidate_image_bytes=None,  # scan pipeline fetches it
            )
            for match in response.matches
        ]
