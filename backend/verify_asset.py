from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
from PIL import Image, UnidentifiedImageError

from app.services.watermark import WatermarkError, extract_watermark
from check_visual_match import (
    compare_orb,
    generate_phash,
    load_image_for_opencv,
    phash_distance,
)
from check_watermark import load_watermark_secret


def classify_match(
    *,
    watermark_verified: bool,
    phash_similarity: float,
    good_matches: int,
    homography_inliers: int,
    inlier_ratio_percent: float | None,
) -> str:
    """
    Return a conservative technical review signal.

    This is not a legal, ownership or infringement determination.
    """
    if watermark_verified:
        return "WATERMARK VERIFIED"

    if (
        phash_similarity >= 90.0
        and homography_inliers >= 20
        and inlier_ratio_percent is not None
        and inlier_ratio_percent >= 60.0
    ):
        return "STRONG VISUAL MATCH — manual review required"

    if (
        phash_similarity >= 75.0
        and homography_inliers >= 10
        and inlier_ratio_percent is not None
        and inlier_ratio_percent >= 35.0
    ):
        return "POSSIBLE VISUAL MATCH — manual review required"

    if good_matches >= 15 and homography_inliers >= 5:
        return "WEAK VISUAL SIGNAL"

    return "NO STRONG VISUAL MATCH SIGNAL"


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Verify a candidate image against a registered reference using "
            "pHash, OpenCV ORB and TraceMyAssets watermark verification."
        )
    )
    parser.add_argument(
        "reference",
        type=Path,
        help="Original or registered reference image.",
    )
    parser.add_argument(
        "candidate",
        type=Path,
        help="Candidate image to inspect.",
    )
    args = parser.parse_args()

    try:
        reference_path = args.reference.expanduser().resolve(strict=True)
        candidate_path = args.candidate.expanduser().resolve(strict=True)

        # pHash comparison.
        reference_hash = generate_phash(reference_path)
        candidate_hash = generate_phash(candidate_path)
        distance = phash_distance(reference_hash, candidate_hash)
        phash_similarity = 100.0 * (1.0 - distance / 64.0)

        # OpenCV ORB comparison.
        reference_image = load_image_for_opencv(reference_path)
        candidate_image = load_image_for_opencv(candidate_path)
        orb_result = compare_orb(reference_image, candidate_image)

        # Watermark check on the candidate. A missing/invalid watermark is
        # a normal result, not an execution error.
        secret = load_watermark_secret()

        with Image.open(candidate_path) as candidate_pil:
            payload = extract_watermark(candidate_pil, secret=secret)

        print("TraceMyAssets asset verification report")
        print("=" * 40)
        print(f"Reference: {reference_path}")
        print(f"Candidate: {candidate_path}")

        print()
        print("Watermark verification")

        if payload is None:
            print("  Status: NOT VERIFIED")
            print(
                "  No valid watermark was recovered using the current "
                "local watermark key."
            )
        else:
            print("  Status: VERIFIED")
            print(f"  Asset ID: {payload.asset_id}")
            print(f"  User ID: {payload.user_id}")
            print(f"  Timestamp (Unix): {payload.timestamp}")
            print(f"  Nonce: {payload.nonce}")

        print()
        print("pHash similarity")
        print(f"  Reference hash: {reference_hash}")
        print(f"  Candidate hash: {candidate_hash}")
        print(f"  Hamming distance: {distance}/64")
        print(f"  Similarity score: {phash_similarity:.2f}%")

        print()
        print("OpenCV ORB feature comparison")
        print(
            "  Reference keypoints: "
            f"{orb_result['reference_keypoints']}"
        )
        print(
            "  Candidate keypoints: "
            f"{orb_result['candidate_keypoints']}"
        )
        print(f"  Good descriptor matches: {orb_result['good_matches']}")
        print(
            "  Geometric inliers (RANSAC): "
            f"{orb_result['homography_inliers']}"
        )

        inlier_ratio = orb_result["inlier_ratio_percent"]

        if inlier_ratio is None:
            print("  Inlier ratio: unavailable (fewer than 4 matches)")
        else:
            print(f"  Inlier ratio: {inlier_ratio:.2f}%")

        overall_signal = classify_match(
            watermark_verified=payload is not None,
            phash_similarity=phash_similarity,
            good_matches=int(orb_result["good_matches"]),
            homography_inliers=int(orb_result["homography_inliers"]),
            inlier_ratio_percent=(
                float(inlier_ratio)
                if inlier_ratio is not None
                else None
            ),
        )

        print()
        print(f"Overall signal: {overall_signal}")

        print()
        print(
            "Interpretation: watermark verification and visual similarity "
            "are separate technical signals. This report does not establish "
            "ownership, copyright infringement, or legal liability."
        )

        return 0

    except FileNotFoundError as exc:
        print(f"Verification failed: file not found: {exc}", file=sys.stderr)
        return 2
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        print(f"Verification failed: {exc}", file=sys.stderr)
        return 2
    except WatermarkError as exc:
        print(f"Watermark configuration failed: {exc}", file=sys.stderr)
        return 2
    except cv2.error as exc:
        print(f"OpenCV verification failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())