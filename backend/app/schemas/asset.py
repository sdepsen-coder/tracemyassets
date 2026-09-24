from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AssetRead(BaseModel):
    id: int
    user_id: int
    title: str
    original_url: str
    thumbnail_url: str
    watermarked_url: str | None = None
    phash_value: str | None
    status: Literal["active", "archived"]
    created_at: datetime


class AssetStats(BaseModel):
    total: int
    active: int
    archived: int


class WatermarkPayloadRead(BaseModel):
    asset_id: int
    user_id: int
    timestamp: int
    nonce: str


class PHashComparisonRead(BaseModel):
    reference_hash: str
    candidate_hash: str
    hamming_distance: int
    similarity_percent: float


class OrbComparisonRead(BaseModel):
    reference_keypoints: int
    candidate_keypoints: int
    good_matches: int
    homography_inliers: int
    inlier_ratio_percent: float | None


class CandidateVerificationRead(BaseModel):
    asset_id: int
    watermark_verified: bool
    watermark_matches_reference: bool
    watermark_payload: WatermarkPayloadRead | None
    phash: PHashComparisonRead
    orb: OrbComparisonRead
    overall_signal: Literal[
        "WATERMARK_VERIFIED",
        "STRONG_VISUAL_MATCH",
        "POSSIBLE_VISUAL_MATCH",
        "WEAK_VISUAL_SIGNAL",
        "NO_STRONG_VISUAL_MATCH",
    ]
    review_recommended: bool

class MonitoringPreferenceRead(BaseModel):
    id: int
    asset_id: int
    enabled: bool
    alert_threshold_percent: float
    scan_frequency: Literal["daily", "weekly", "monthly"]
    created_at: datetime
    updated_at: datetime


class MonitoringPreferenceUpdate(BaseModel):
    enabled: bool
    alert_threshold_percent: float = Field(ge=1.0, le=100.0)
    scan_frequency: Literal["daily", "weekly", "monthly"]

class ScanJobRead(BaseModel):
    id: int
    asset_id: int
    provider: str
    status: Literal[
        "queued",
        "running",
        "completed",
        "failed",
        "cancelled",
    ]
    started_at: datetime | None
    completed_at: datetime | None
    candidate_count: int
    match_count: int
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class MatchRecordRead(BaseModel):
    id: int
    asset_id: int
    scan_job_id: int | None
    source_name: str
    source_url: str | None
    candidate_image_url: str | None
    candidate_page_url: str | None
    candidate_image_hash: str | None
    similarity_percent: float
    watermark_verified: bool
    watermark_matches_reference: bool
    overall_signal: Literal[
        "WATERMARK_VERIFIED",
        "STRONG_VISUAL_MATCH",
        "POSSIBLE_VISUAL_MATCH",
        "WEAK_VISUAL_SIGNAL",
        "NO_STRONG_VISUAL_MATCH",
    ]
    review_status: Literal[
        "new",
        "reviewing",
        "confirmed",
        "dismissed",
        "archived",
    ]
    found_at: datetime
    reviewed_at: datetime | None
    dismissed_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class AssetScanRead(BaseModel):
    asset_id: int
    provider: str
    threshold_percent: float
    scan_job: ScanJobRead
    matches: list[MatchRecordRead]

class MatchRecordUpdate(BaseModel):
    review_status: Literal[
        "reviewing",
        "confirmed",
        "dismissed",
        "archived",
    ]
    notes: str | None = Field(default=None, max_length=5000)