import unittest
from datetime import datetime, timezone

from app.models.match_record import MatchRecord
from app.services.match_presentation import build_match_record_response


class BuildMatchRecordResponseTests(unittest.TestCase):
    def _match(self) -> MatchRecord:
        match = MatchRecord(
            id=1,
            asset_id=7,
            scan_job_id=3,
            source_name="Some Marketplace",
            source_url="https://example.com/shop/item",
            candidate_image_url="https://example.com/img.jpg",
            candidate_page_url="https://example.com/shop/item",
            candidate_image_hash="abc123",
            similarity_percent=91.5,
            watermark_verified=True,
            watermark_matches_reference=True,
            overall_signal="WATERMARK_VERIFIED",
            review_status="new",
        )
        # Timestamps aren't DB-populated outside a real session; set
        # them directly so the schema (which requires them) validates.
        now = datetime.now(timezone.utc)
        match.found_at = now
        match.created_at = now
        match.updated_at = now

        return match

    def test_free_plan_redacts_source_but_keeps_signal(self) -> None:
        response = build_match_record_response(
            self._match(), plan_type="Free"
        )

        self.assertIsNone(response.source_name)
        self.assertIsNone(response.source_url)
        self.assertIsNone(response.candidate_image_url)
        self.assertIsNone(response.candidate_page_url)
        self.assertTrue(response.source_locked)

        # The honest technical signal is never hidden.
        self.assertEqual(response.similarity_percent, 91.5)
        self.assertEqual(response.overall_signal, "WATERMARK_VERIFIED")
        self.assertTrue(response.watermark_matches_reference)
        self.assertEqual(response.candidate_image_hash, "abc123")

    def test_pro_plan_reveals_everything(self) -> None:
        response = build_match_record_response(
            self._match(), plan_type="Pro"
        )

        self.assertEqual(response.source_name, "Some Marketplace")
        self.assertEqual(
            response.source_url, "https://example.com/shop/item"
        )
        self.assertFalse(response.source_locked)

    def test_unknown_or_missing_plan_defaults_to_locked(self) -> None:
        locked_for_unknown = build_match_record_response(
            self._match(), plan_type="SomeFuturePlan"
        )
        locked_for_none = build_match_record_response(
            self._match(), plan_type=None
        )

        self.assertTrue(locked_for_unknown.source_locked)
        self.assertTrue(locked_for_none.source_locked)


if __name__ == "__main__":
    unittest.main()
