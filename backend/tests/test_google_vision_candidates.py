import unittest
from unittest import mock

from app.services.google_vision_visual_search import GoogleVisionWebDetectionProvider


def _provider(web_detection: dict) -> GoogleVisionWebDetectionProvider:
    provider = GoogleVisionWebDetectionProvider.__new__(GoogleVisionWebDetectionProvider)
    provider.max_results = 20
    response = mock.Mock(ok=True)
    response.json.return_value = {
        "responses": [{"webDetection": web_detection}]
    }
    provider._session = mock.Mock()
    provider._session.post.return_value = response
    provider._reserve_request = mock.Mock()

    return provider


class GoogleVisionCandidateTests(unittest.TestCase):
    def find(self, web_detection, tmp_path):
        path = tmp_path / "ref.png"
        path.write_bytes(b"\x89PNG")

        return _provider(web_detection).find_candidates(
            asset_id=1,
            asset_title="t",
            reference_original_path=path,
            reference_watermarked_path=None,
        )

    def setUp(self) -> None:
        import pathlib
        import tempfile

        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        self.tmp = pathlib.Path(self._dir.name)

    def test_standalone_matching_images_become_candidates(self) -> None:
        candidates = self.find(
            {
                "pagesWithMatchingImages": [],
                "fullMatchingImages": [{"url": "https://cdn.example/a.jpg"}],
                "partialMatchingImages": [{"url": "https://cdn.example/b.jpg"}],
            },
            self.tmp,
        )

        self.assertEqual(
            [c.candidate_image_url for c in candidates],
            ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
        )
        self.assertTrue(all(c.candidate_page_url is None for c in candidates))
        self.assertTrue(all(not c.page_may_be_stale for c in candidates))

    def test_images_already_attached_to_a_page_are_not_repeated(self) -> None:
        candidates = self.find(
            {
                "pagesWithMatchingImages": [
                    {
                        "url": "https://shop.example/p",
                        "fullMatchingImages": [
                            {"url": "https://cdn.example/a.jpg"}
                        ],
                    }
                ],
                "fullMatchingImages": [{"url": "https://cdn.example/a.jpg"}],
            },
            self.tmp,
        )

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].candidate_page_url, "https://shop.example/p")
        self.assertTrue(candidates[0].page_may_be_stale)

    def test_pages_without_an_image_are_still_reported(self) -> None:
        candidates = self.find(
            {"pagesWithMatchingImages": [{"url": "https://shop.example/p"}]},
            self.tmp,
        )

        self.assertEqual(len(candidates), 1)
        self.assertIsNone(candidates[0].candidate_image_url)


if __name__ == "__main__":
    unittest.main()


class GoogleVisionBudgetTests(unittest.TestCase):
    def _call(self, provider, tmp_path):
        path = tmp_path / "ref.png"
        path.write_bytes(b"\x89PNG")

        return provider.find_candidates(
            asset_id=1,
            asset_title="t",
            reference_original_path=path,
            reference_watermarked_path=None,
        )

    def setUp(self) -> None:
        import pathlib
        import tempfile

        self._dir = tempfile.TemporaryDirectory()
        self.addCleanup(self._dir.cleanup)
        self.tmp = pathlib.Path(self._dir.name)

    def test_a_spent_allowance_stops_the_request(self) -> None:
        from app.services.provider_budget import ProviderBudgetExceeded

        provider = _provider({})
        provider._reserve_request = mock.Mock(
            side_effect=ProviderBudgetExceeded("vision", "daily")
        )

        with self.assertRaises(ProviderBudgetExceeded):
            self._call(provider, self.tmp)

        provider._session.post.assert_not_called()

    def test_every_request_is_counted_first(self) -> None:
        provider = _provider({})

        self._call(provider, self.tmp)

        provider._reserve_request.assert_called_once_with(1)
        provider._session.post.assert_called_once()

    def test_reserve_uses_the_vision_limits(self) -> None:
        from app.services import google_vision_visual_search as gv

        provider = _provider({})
        provider._reserve_request = (
            gv.GoogleVisionWebDetectionProvider._reserve_request.__get__(
                provider
            )
        )

        with mock.patch.object(gv, "reserve_units") as reserve, mock.patch.object(
            gv, "SessionLocal"
        ):
            provider._reserve_request(7)

        args, kwargs = reserve.call_args
        self.assertEqual(args[1], "vision")
        self.assertEqual(kwargs["asset_id"], 7)
        self.assertEqual(kwargs["daily_limit"], gv.settings.vision_daily_limit)
        self.assertEqual(
            kwargs["monthly_limit"], gv.settings.vision_monthly_limit
        )
