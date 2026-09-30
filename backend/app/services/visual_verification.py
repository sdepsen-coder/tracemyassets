from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from app.services.asset_ingestion import (
    ALLOWED_FORMATS,
    MAX_IMAGE_PIXELS,
    MAX_UPLOAD_BYTES,
    UploadValidationError,
)
from app.services.watermark import (
    WatermarkError,
    WatermarkPayload,
    extract_watermark,
    generate_phash,
)


@dataclass(frozen=True)
class OrbComparison:
    reference_keypoints: int
    candidate_keypoints: int
    good_matches: int
    homography_inliers: int
    inlier_ratio_percent: float | None


@dataclass(frozen=True)
class VisualVerificationResult:
    watermark_payload: WatermarkPayload | None
    watermark_matches_reference: bool
    reference_phash: str
    candidate_phash: str
    phash_hamming_distance: int
    phash_similarity_percent: float
    orb: OrbComparison
    overall_signal: str
    review_recommended: bool


# A perceptual hash compares whole-image layout, so it collapses when a copy
# is cropped, framed, or shown inside a room mockup (typical of stolen art on
# marketplaces). ORB keypoints checked with a RANSAC homography survive those
# changes: on test variants of one artwork, crops and mockups produced 450-650
# geometrically consistent points while unrelated images produced at most 4.
GEOMETRIC_STRONG_MIN_INLIERS = 40
GEOMETRIC_STRONG_MIN_RATIO = 60.0
GEOMETRIC_MIN_INLIERS = 25
GEOMETRIC_MIN_RATIO = 50.0


def is_geometric_copy(
    homography_inliers: int,
    inlier_ratio_percent: float | None,
) -> bool:
    """True when the candidate shows the reference artwork, even cropped,
    scaled, framed or in perspective, judged by ORB + homography alone."""
    return (
        inlier_ratio_percent is not None
        and homography_inliers >= GEOMETRIC_MIN_INLIERS
        and inlier_ratio_percent >= GEOMETRIC_MIN_RATIO
    )


def classify_match(
    *,
    watermark_verified: bool,
    phash_similarity_percent: float,
    good_matches: int,
    homography_inliers: int,
    inlier_ratio_percent: float | None,
) -> tuple[str, bool]:
    """
    Return a conservative technical review signal.

    This does not determine ownership, infringement, or legal liability.
    """
    if watermark_verified:
        return ("WATERMARK_VERIFIED", True)

    if (
        inlier_ratio_percent is not None
        and homography_inliers >= GEOMETRIC_STRONG_MIN_INLIERS
        and inlier_ratio_percent >= GEOMETRIC_STRONG_MIN_RATIO
    ):
        return ("STRONG_VISUAL_MATCH", True)

    if (
        phash_similarity_percent >= 90.0
        and homography_inliers >= 20
        and inlier_ratio_percent is not None
        and inlier_ratio_percent >= 60.0
    ):
        return ("STRONG_VISUAL_MATCH", True)

    if is_geometric_copy(homography_inliers, inlier_ratio_percent):
        return ("POSSIBLE_VISUAL_MATCH", True)

    if (
        phash_similarity_percent >= 75.0
        and homography_inliers >= 10
        and inlier_ratio_percent is not None
        and inlier_ratio_percent >= 35.0
    ):
        return ("POSSIBLE_VISUAL_MATCH", True)

    if good_matches >= 15 and homography_inliers >= 5:
        return ("WEAK_VISUAL_SIGNAL", False)

    return ("NO_STRONG_VISUAL_MATCH", False)


def read_candidate_bytes(source) -> bytes:
    """
    Read one candidate upload without persisting it to disk.
    """
    content = source.read(MAX_UPLOAD_BYTES + 1)

    if not content:
        raise UploadValidationError("The candidate image is empty.")

    if len(content) > MAX_UPLOAD_BYTES:
        raise UploadValidationError(
            "Candidate image size must not exceed 25 MiB."
        )

    return content


def validate_candidate_image(content: bytes) -> None:
    """
    Validate format, dimensions and animation status for an in-memory image.
    """
    try:
        with Image.open(BytesIO(content)) as image:
            image_format = image.format

            if image_format not in ALLOWED_FORMATS:
                raise UploadValidationError(
                    "Only PNG, JPEG and WEBP images are supported."
                )

            width, height = image.size

            if width <= 0 or height <= 0:
                raise UploadValidationError(
                    "Image dimensions must be positive."
                )

            if width * height > MAX_IMAGE_PIXELS:
                raise UploadValidationError(
                    "Image resolution must not exceed 25 megapixels."
                )

            if getattr(image, "is_animated", False):
                raise UploadValidationError(
                    "Animated images are not supported."
                )

            image.load()

    except UploadValidationError:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise UploadValidationError(
            "The candidate file is not a valid supported image."
        ) from exc


def load_pil_image(content: bytes) -> Image.Image:
    """
    Return an RGB/RGBA-compatible copy detached from its input buffer.
    """
    try:
        with Image.open(BytesIO(content)) as image:
            image.load()

            with ImageOps.exif_transpose(image) as oriented:
                return oriented.copy()

    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise UploadValidationError(
            "The candidate image could not be decoded."
        ) from exc


def load_opencv_image_from_bytes(content: bytes) -> np.ndarray:
    encoded = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    if image is None:
        raise UploadValidationError(
            "The candidate image could not be decoded by OpenCV."
        )

    return image


def load_opencv_image_from_path(path: Path) -> np.ndarray:
    """
    Decode through bytes so Windows paths with Unicode characters work.
    """
    encoded = np.fromfile(str(path), dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    if image is None:
        raise RuntimeError("The registered artwork could not be decoded.")

    return image


def compare_orb(
    reference: np.ndarray,
    candidate: np.ndarray,
) -> OrbComparison:
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

    if reference_descriptors is None or candidate_descriptors is None:
        return OrbComparison(
            reference_keypoints=reference_count,
            candidate_keypoints=candidate_count,
            good_matches=0,
            homography_inliers=0,
            inlier_ratio_percent=None,
        )

    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    raw_matches = matcher.knnMatch(
        reference_descriptors,
        candidate_descriptors,
        k=2,
    )

    good_matches = []

    for pair in raw_matches:
        if len(pair) != 2:
            continue

        best, second = pair

        if best.distance < 0.75 * second.distance:
            good_matches.append(best)

    if len(good_matches) < 4:
        return OrbComparison(
            reference_keypoints=reference_count,
            candidate_keypoints=candidate_count,
            good_matches=len(good_matches),
            homography_inliers=0,
            inlier_ratio_percent=None,
        )

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
        return OrbComparison(
            reference_keypoints=reference_count,
            candidate_keypoints=candidate_count,
            good_matches=len(good_matches),
            homography_inliers=0,
            inlier_ratio_percent=None,
        )

    inliers = int(mask.ravel().sum())

    return OrbComparison(
        reference_keypoints=reference_count,
        candidate_keypoints=candidate_count,
        good_matches=len(good_matches),
        homography_inliers=inliers,
        inlier_ratio_percent=100.0 * inliers / len(good_matches),
    )


def verify_candidate_image(
    *,
    reference_path: Path,
    reference_phash: str | None,
    expected_asset_id: int,
    expected_user_id: int,
    candidate_content: bytes,
    watermark_secret: bytes,
) -> VisualVerificationResult:
    """
    Compare an in-memory candidate image with one registered artwork.

    The candidate is never written to permanent application storage.
    """
    validate_candidate_image(candidate_content)

    with Image.open(reference_path) as reference_source:
        reference_source.load()

        with ImageOps.exif_transpose(reference_source) as oriented:
            reference_image = oriented.copy()

    candidate_image = load_pil_image(candidate_content)

    try:
        computed_reference_phash = reference_phash or generate_phash(
            reference_image
        )
        candidate_phash = generate_phash(candidate_image)

        phash_distance = (
            int(computed_reference_phash, 16)
            ^ int(candidate_phash, 16)
        ).bit_count()

        phash_similarity = 100.0 * (1.0 - phash_distance / 64.0)

        watermark_payload = extract_watermark(
            candidate_image,
            secret=watermark_secret,
        )

        reference_opencv = load_opencv_image_from_path(reference_path)
        candidate_opencv = load_opencv_image_from_bytes(candidate_content)
        orb = compare_orb(reference_opencv, candidate_opencv)

        watermark_matches_reference = (
            watermark_payload is not None
            and watermark_payload.asset_id == expected_asset_id
            and watermark_payload.user_id == expected_user_id
        )

        overall_signal, review_recommended = classify_match(
            watermark_verified=watermark_matches_reference,
            phash_similarity_percent=phash_similarity,
            good_matches=orb.good_matches,
            homography_inliers=orb.homography_inliers,
            inlier_ratio_percent=orb.inlier_ratio_percent,
        )

        return VisualVerificationResult(
            watermark_payload=watermark_payload,
            watermark_matches_reference=watermark_matches_reference,
            reference_phash=computed_reference_phash,
            candidate_phash=candidate_phash,
            phash_hamming_distance=phash_distance,
            phash_similarity_percent=phash_similarity,
            orb=orb,
            overall_signal=overall_signal,
            review_recommended=review_recommended,
        )
    finally:
        reference_image.close()
        candidate_image.close()