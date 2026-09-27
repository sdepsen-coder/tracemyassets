"""
Google Cloud Vision Web Detection provider.

Selected via VISUAL_SEARCH_PROVIDER=google-vision (see
app.services.visual_search_provider.get_configured_provider) --
this class itself has no FastAPI/endpoint wiring of its own.

Uses a Google Cloud service account rather than a plain API key. This
matches the path the Cloud Console guides you toward for a server-side
script accessing its own application's data: when the "Create
credentials" wizard asks "What data will you be accessing?", choose
"Application data" (not "User data" -- that's for accessing another
Google user's personal data via OAuth consent, which does not apply
here).

Setup (do this yourself -- Claude does not create accounts, service
accounts, or keys on your behalf):
    1. Google Cloud Console -> APIs & Services -> Credentials ->
       Create credentials -> choose "Application data". This creates
       a service account.
    2. Give it a name/description -> "Create and continue" -> grant
       it the "Project > Owner" role (fine for getting started; a
       narrower role can be set later for production) -> "Continue"
       -> "Done".
    3. Click the service account's email -> "Keys" tab -> "Add key"
       -> "Create new key" -> JSON. A .json file downloads.

Two ways to supply that key, tried in this order:
    1. GOOGLE_APPLICATION_CREDENTIALS_JSON -- the *contents* of the
       downloaded JSON file, pasted directly into an env var. Use
       this on platforms like Railway/Render where uploading an
       arbitrary file isn't practical -- paste the whole JSON blob
       as the variable's value in the dashboard.
    2. GOOGLE_APPLICATION_CREDENTIALS -- a file *path* (local dev),
       e.g. in PowerShell:
       $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\key.json"

Requires: pip install google-auth
(Deliberately not the full google-cloud-vision client library -- that
pulls in grpc and other heavy dependencies for a single REST call.)
"""

from __future__ import annotations

import base64
import json
import os

import google.auth
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

from app.services.visual_search_provider import DiscoveredCandidate

VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate"
REQUEST_TIMEOUT_SECONDS = 15.0
CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


class GoogleVisionWebDetectionProvider:
    """
    Discovery provider backed by Google Cloud Vision's Web Detection.

    Returns pages where a visually similar (or identical) image was
    found on the web. Like every provider, it never computes its own
    similarity score or watermark verdict -- the scan pipeline always
    re-verifies each candidate through verify_candidate_image().
    """

    name = "google-vision"

    def __init__(
        self,
        credentials_path: str | None = None,
        max_results: int = 20,
    ) -> None:
        credentials_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

        if credentials_json:
            # Production (e.g. Railway): the service account key lives
            # in an env var, not a file on disk -- build credentials
            # directly from the parsed JSON, no temp file needed.
            info = json.loads(credentials_json)
            credentials = service_account.Credentials.from_service_account_info(
                info,
                scopes=[CLOUD_PLATFORM_SCOPE],
            )
        elif credentials_path:
            credentials = (
                service_account.Credentials.from_service_account_file(
                    credentials_path,
                    scopes=[CLOUD_PLATFORM_SCOPE],
                )
            )
        else:
            # Local dev fallback: reads GOOGLE_APPLICATION_CREDENTIALS
            # (a file path) via the standard google-auth mechanism.
            credentials, _ = google.auth.default(
                scopes=[CLOUD_PLATFORM_SCOPE]
            )

        self._session = AuthorizedSession(credentials)
        self.max_results = max_results

    def find_candidates(
        self,
        *,
        asset_id: int,
        asset_title: str,
        reference_original_path,
        reference_watermarked_path,
    ) -> list[DiscoveredCandidate]:
        with open(reference_original_path, "rb") as handle:
            encoded_image = base64.b64encode(handle.read()).decode("ascii")

        body = {
            "requests": [
                {
                    "image": {"content": encoded_image},
                    "features": [
                        {
                            "type": "WEB_DETECTION",
                            "maxResults": self.max_results,
                        }
                    ],
                }
            ]
        }

        response = self._session.post(
            VISION_API_URL,
            json=body,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )

        if not response.ok:
            raise RuntimeError(
                f"Vision API request failed ({response.status_code}): "
                f"{response.text}"
            )

        payload = response.json()
        web_detection = payload["responses"][0].get("webDetection", {})

        candidates: list[DiscoveredCandidate] = []

        for page in web_detection.get("pagesWithMatchingImages", []):
            page_url = page.get("url")
            page_title = page.get("pageTitle") or "Google Web Detection"

            matching_images = page.get(
                "fullMatchingImages", []
            ) or page.get("partialMatchingImages", [])
            image_url = (
                matching_images[0]["url"] if matching_images else None
            )

            candidates.append(
                DiscoveredCandidate(
                    source_name=page_title,
                    source_url=page_url,
                    candidate_image_url=image_url,
                    candidate_page_url=page_url,
                    candidate_image_bytes=None,  # scan pipeline fetches it
                )
            )

        return candidates
