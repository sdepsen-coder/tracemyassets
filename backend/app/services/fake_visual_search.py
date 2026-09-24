from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image

from app.services.visual_search_provider import DiscoveredCandidate

TRANSFORMED_RESIZE_RATIO = 0.8
TRANSFORMED_JPEG_QUALITY = 75


class FakeVisualSearchProvider:
    """
    Test provider for the monitoring flow.

    This does not scan the public web. It returns deterministic demo
    candidates so the product flow -- including our own verification
    pipeline -- can be exercised end-to-end before connecting a real,
    policy-compliant visual search provider.

    Unlike the earlier version of this provider, it does not invent a
    similarity score or watermark verdict. It supplies real
    candidate_image_bytes derived from the asset's own files, so the
    scan endpoint runs the exact same pHash/watermark/ORB comparison it
    would run against a real discovered image.
    """

    name = "fake"

    def find_candidates(
        self,
        *,
        asset_id: int,
        asset_title: str,
        reference_original_path: Path,
        reference_watermarked_path: Path | None,
    ) -> list[DiscoveredCandidate]:
        safe_title = asset_title.strip() or f"Asset {asset_id}"
        candidates: list[DiscoveredCandidate] = []

        if reference_watermarked_path is not None and (
            reference_watermarked_path.is_file()
        ):
            # A verbatim re-hosted copy of the protected file -- the
            # watermark should survive intact, exercising the
            # WATERMARK_VERIFIED path with a real extraction.
            candidates.append(
                DiscoveredCandidate(
                    source_name="Demo source (verbatim re-upload)",
                    source_url=(
                        f"https://example.com/demo/source/{asset_id}-a"
                    ),
                    candidate_image_url=None,
                    candidate_page_url=(
                        f"https://example.com/demo/pages/{asset_id}-a"
                    ),
                    candidate_image_bytes=(
                        reference_watermarked_path.read_bytes()
                    ),
                )
            )

        # A resized, recompressed reuse of the original -- simulates a
        # copy that predates watermarking (or was re-encoded by a third
        # party), so pHash should still flag it while the watermark
        # will typically not survive. This is deliberately honest: we
        # do not claim watermark robustness we have not verified.
        with Image.open(reference_original_path) as original:
            rgb = original.convert("RGB")
            resized = rgb.resize(
                (
                    max(1, int(rgb.width * TRANSFORMED_RESIZE_RATIO)),
                    max(1, int(rgb.height * TRANSFORMED_RESIZE_RATIO)),
                )
            )

            with BytesIO() as buffer:
                resized.save(
                    buffer,
                    format="JPEG",
                    quality=TRANSFORMED_JPEG_QUALITY,
                )
                transformed_bytes = buffer.getvalue()

            resized.close()
            rgb.close()

        candidates.append(
            DiscoveredCandidate(
                source_name="Demo source (resized reupload)",
                source_url=f"https://example.com/demo/source/{asset_id}-b",
                candidate_image_url=None,
                candidate_page_url=(
                    f"https://example.com/demo/pages/{asset_id}-b"
                ),
                candidate_image_bytes=transformed_bytes,
            )
        )

        return candidates
