import unittest
from unittest import mock

from app.services.etsy_visual_search import EtsyProvider


class _FakeResponse:
    def __init__(self, status_code: int, json_data=None, text: str = ""):
        self.status_code = status_code
        self._json_data = json_data or {}
        self.text = text

    @property
    def is_success(self) -> bool:
        return 200 <= self.status_code < 300

    def json(self):
        return self._json_data


class EtsyProviderTests(unittest.TestCase):
    def test_missing_api_key_raises(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(RuntimeError):
                EtsyProvider()

    def test_finds_candidates_with_images(self) -> None:
        provider = EtsyProvider(api_key="key")

        fake_payload = {
            "results": [
                {
                    "listing_id": 123,
                    "title": "Botanical watercolor print",
                    "url": "https://www.etsy.com/listing/123",
                    "images": [
                        {
                            "url_75x75": "https://etsy.example/75.jpg",
                            "url_170x135": "https://etsy.example/170.jpg",
                            "url_570xN": "https://etsy.example/570.jpg",
                            "url_fullxfull": "https://etsy.example/full.jpg",
                        }
                    ],
                }
            ]
        }

        with mock.patch(
            "app.services.etsy_visual_search.httpx.get",
            return_value=_FakeResponse(200, fake_payload),
        ) as mock_get:
            candidates = provider.find_candidates(
                asset_id=1,
                asset_title="Botanical watercolor print",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        mock_get.assert_called_once()
        call_kwargs = mock_get.call_args.kwargs
        self.assertEqual(
            call_kwargs["params"]["keywords"], "Botanical watercolor print"
        )
        self.assertEqual(call_kwargs["params"]["includes"], "Images")
        self.assertEqual(call_kwargs["headers"]["x-api-key"], "key")

        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        # Largest available variant (url_fullxfull) should be preferred.
        self.assertEqual(candidate.candidate_image_url, "https://etsy.example/full.jpg")
        self.assertEqual(
            candidate.candidate_page_url, "https://www.etsy.com/listing/123"
        )
        self.assertTrue(candidate.source_name.startswith("Etsy:"))
        self.assertIsNone(candidate.candidate_image_bytes)

    def test_falls_back_to_smaller_image_variant(self) -> None:
        provider = EtsyProvider(api_key="key")

        fake_payload = {
            "results": [
                {
                    "title": "No full-size image",
                    "url": "https://www.etsy.com/listing/456",
                    "images": [{"url_170x135": "https://etsy.example/170.jpg"}],
                }
            ]
        }

        with mock.patch(
            "app.services.etsy_visual_search.httpx.get",
            return_value=_FakeResponse(200, fake_payload),
        ):
            candidates = provider.find_candidates(
                asset_id=1,
                asset_title="Anything",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        self.assertEqual(
            candidates[0].candidate_image_url, "https://etsy.example/170.jpg"
        )

    def test_listing_without_images_is_skipped(self) -> None:
        provider = EtsyProvider(api_key="key")

        fake_payload = {
            "results": [{"title": "No images key at all", "url": "https://example.com"}]
        }

        with mock.patch(
            "app.services.etsy_visual_search.httpx.get",
            return_value=_FakeResponse(200, fake_payload),
        ):
            candidates = provider.find_candidates(
                asset_id=1,
                asset_title="Anything",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        self.assertEqual(candidates, [])

    def test_long_title_is_truncated_to_fit_source_name_column(self) -> None:
        provider = EtsyProvider(api_key="key")

        fake_payload = {
            "results": [
                {
                    "title": "B" * 300,
                    "url": "https://example.com",
                    "images": [{"url_570xN": "https://etsy.example/570.jpg"}],
                }
            ]
        }

        with mock.patch(
            "app.services.etsy_visual_search.httpx.get",
            return_value=_FakeResponse(200, fake_payload),
        ):
            candidates = provider.find_candidates(
                asset_id=1,
                asset_title="Anything",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        self.assertLessEqual(len(candidates[0].source_name), 100)

    def test_empty_asset_title_returns_no_candidates_without_a_request(
        self,
    ) -> None:
        provider = EtsyProvider(api_key="key")

        with mock.patch("app.services.etsy_visual_search.httpx.get") as mock_get:
            candidates = provider.find_candidates(
                asset_id=1,
                asset_title="   ",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        mock_get.assert_not_called()
        self.assertEqual(candidates, [])

    def test_failed_request_raises(self) -> None:
        provider = EtsyProvider(api_key="key")

        with mock.patch(
            "app.services.etsy_visual_search.httpx.get",
            return_value=_FakeResponse(401, text="Unauthorized"),
        ):
            with self.assertRaises(RuntimeError):
                provider.find_candidates(
                    asset_id=1,
                    asset_title="Anything",
                    reference_original_path=None,
                    reference_watermarked_path=None,
                )


if __name__ == "__main__":
    unittest.main()
