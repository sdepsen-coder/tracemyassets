from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CandidateDiscoveryResult:
    source_name: str
    source_url: str | None
    candidate_image_url: str | None
    candidate_page_url: str | None
    candidate_image_hash: str | None
    similarity_percent: float
    watermark_verified: bool
    watermark_matches_reference: bool
    overall_signal: str


class FakeVisualSearchProvider:
    """
    Test provider for the monitoring flow.

    This does not scan the public web. It returns deterministic demo
    candidates so the product flow can be developed end-to-end before
    connecting a real, policy-compliant visual search provider.
    """

    name = "fake"

    def find_candidates(
        self,
        *,
        asset_id: int,
        asset_title: str,
    ) -> list[CandidateDiscoveryResult]:
        safe_title = asset_title.strip() or f"Asset {asset_id}"

        return [
            CandidateDiscoveryResult(
                source_name="Demo Visual Search",
                source_url=f"https://example.com/demo/source/{asset_id}",
                candidate_image_url=(
                    f"https://example.com/demo/images/{asset_id}-strong.jpg"
                ),
                candidate_page_url=(
                    f"https://example.com/demo/pages/{asset_id}-strong"
                ),
                candidate_image_hash=f"fake:{asset_id}:strong",
                similarity_percent=92.0,
                watermark_verified=False,
                watermark_matches_reference=False,
                overall_signal="STRONG_VISUAL_MATCH",
            ),
            CandidateDiscoveryResult(
                source_name="Demo Visual Search",
                source_url=f"https://example.com/demo/source/{asset_id}",
                candidate_image_url=(
                    f"https://example.com/demo/images/{asset_id}-possible.jpg"
                ),
                candidate_page_url=(
                    f"https://example.com/demo/pages/{asset_id}-possible"
                ),
                candidate_image_hash=f"fake:{asset_id}:possible",
                similarity_percent=78.0,
                watermark_verified=False,
                watermark_matches_reference=False,
                overall_signal="POSSIBLE_VISUAL_MATCH",
            ),
        ]