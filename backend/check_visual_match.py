from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import imagehash
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError


def load_image_for_opencv(path: Path) -> np.ndarray:
    """
    Load an image through bytes so Windows paths containing Unicode
    characters also work reliably with OpenCV.
    """
    encoded = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("The file could not be decoded as an image.")

    return image


def generate_phash(path: Path) -> str:
    """Return the project's standard 64-bit perceptual hash."""
    with Image.open(path) as image:
        with ImageOps.exif_transpose(image) as oriented:
            with oriented.convert("RGB") as rgb:
                return str(imagehash.phash(rgb, hash_size=8))


def phash_distance(first_hash: str, second_hash: str) -> int:
    return (int(first_hash, 16) ^ int(second_hash, 16)).bit_count()


def compare_orb(
    reference: np.ndarray,
    candidate: np.ndarray,
) -> dict[str, int | float | None]:
    """
    Compare images using OpenCV ORB feature matching.

    This is a technical similarity signal, not proof of ownership,
    copyright infringement, or an exact duplicate.
    """
    reference_gray = cv2.cvtColor(reference, cv2.COLOR_BGR2GRAY)
    candidate_gray = cv2.cvtColor(candidate, cv2.COLOR_BGR2GRAY)

    orb = cv2.ORB_create(
        nfeatures=2000,
        scaleFactor=1.2,
        nlevels=8,
        edgeThreshold=31,
        fastThreshold=12,
    )

    reference_points, reference_descriptors = orb.detectAndCompute(
        reference_gray,
        None,
    )
    candidate_points, candidate_descriptors = orb.detectAndCompute(
        candidate_gray,
        None,
    )

    reference_count = len(reference_points) if reference_points else 0
    candidate_count = len(candidate_points) if candidate_points else 0

    result: dict[str, int | float | None] = {
        "reference_keypoints": reference_count,
        "candidate_keypoints": candidate_count,
        "good_matches": 0,
        "homography_inliers": 0,
        "inlier_ratio_percent": None,
    }

    if reference_descriptors is None or candidate_descriptors is None:
        return result

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    raw_matches = matcher.knnMatch(
        reference_descriptors,
        candidate_descriptors,
        k=2,
    )

    good_matches = []

    # Lowe ratio test: retain matches significantly better than their
    # second-nearest alternative.
    for pair in raw_matches:
        if len(pair) != 2:
            continue

        best, second = pair

        if best.distance < 0.75 * second.distance:
            good_matches.append(best)

    result["good_matches"] = len(good_matches)

    if len(good_matches) < 4:
        return result

    source_points = np.float32(
        [reference_points[match.queryIdx].pt for match in good_matches]
    ).reshape(-1, 1, 2)

    target_points = np.float32(
        [candidate_points[match.trainIdx].pt for match in good_matches]
    ).reshape(-1, 1, 2)

    _, mask = cv2.findHomography(
        source_points,
        target_points,
        cv2.RANSAC,
        5.0,
    )

    if mask is None:
        return result

    inliers = int(mask.ravel().sum())
    result["homography_inliers"] = inliers
    result["inlier_ratio_percent"] = (
        100.0 * inliers / len(good_matches)
    )

    return result


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Compare two images using pHash and OpenCV ORB feature matching."
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
        help="Image to compare against the reference.",
    )
    args = parser.parse_args()

    try:
        reference_path = args.reference.expanduser().resolve(strict=True)
        candidate_path = args.candidate.expanduser().resolve(strict=True)

        reference_hash = generate_phash(reference_path)
        candidate_hash = generate_phash(candidate_path)
        distance = phash_distance(reference_hash, candidate_hash)
        phash_similarity = 100.0 * (1.0 - distance / 64.0)

        reference_image = load_image_for_opencv(reference_path)
        candidate_image = load_image_for_opencv(candidate_path)
        orb_result = compare_orb(reference_image, candidate_image)

        print(f"Reference: {reference_path}")
        print(f"Candidate: {candidate_path}")
        print()
        print("pHash")
        print(f"  Reference hash: {reference_hash}")
        print(f"  Candidate hash: {candidate_hash}")
        print(f"  Hamming distance: {distance}/64")
        print(f"  Similarity score: {phash_similarity:.2f}%")
        print()
        print("OpenCV ORB")
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

        print()
        print(
            "Note: These are technical similarity signals only. "
            "They do not establish ownership or infringement."
        )

        return 0

    except FileNotFoundError as exc:
        print(f"Check failed: file not found: {exc}", file=sys.stderr)
        return 2
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        print(f"Check failed: {exc}", file=sys.stderr)
        return 2
    except cv2.error as exc:
        print(f"OpenCV check failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())