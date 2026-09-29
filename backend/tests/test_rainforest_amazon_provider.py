import unittest
from unittest import mock

from app.services.rainforest_amazon_visual_search import RainforestAmazonProvider


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


class RainforestAmazonProviderTests(unittest.TestCase):
    def test_missing_api_key_raises(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(RuntimeError):
                RainforestAmazonProvider()

    def test_domains_default_to_amazon_co_uk(self) -> None:
        provider = RainforestAmazonProvider(api_key="key")

        self.assertEqual(provider.domains, ["amazon.co.uk"])

    def test_domains_env_var_is_comma_split(self) -> None:
        with mock.patch.dict(
            "os.environ",
            {"RAINFOREST_AMAZON_DOMAINS": "amazon.com, amazon.co.uk"},
        ):
            provider = RainforestAmazonProvider(api_key="key")

        self.assertEqual(provider.domains, ["amazon.com", "amazon.co.uk"])

    def test_finds_candidates_with_images(self) -> None:
        provider = RainforestAmazonProvider(api_key="key", domains=["amazon.co.uk"])

        fake_payload = {
            "search_results": [
                {
                    "title": "Smith Mugs Art Timeline Mug",
                    "link": "https://www.amazon.co.uk/dp/B077V3XGG1",
                    "image": "https://m.media-amazon.com/images/example.jpg",
                    "asin": "B077V3XGG1",
                }
            ]
        }

        with mock.patch(
            "app.services.rainforest_amazon_visual_search.httpx.get",
            return_value=_FakeResponse(200, fake_payload),
        ) as mock_get:
            candidates = provider.find_candidates(
                asset_id=1,
                asset_title="Smith Mugs Art Timeline Mug",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        mock_get.assert_called_once()
        call_kwargs = mock_get.call_args.kwargs
        self.assertEqual(call_kwargs["params"]["amazon_domain"], "amazon.co.uk")
        self.assertEqual(call_kwargs["params"]["type"], "search")

        self.assertEqual(len(candidates), 1)
        candidate = candidates[0]
        self.assertEqual(
            candidate.candidate_image_url,
            "https://m.media-amazon.com/images/example.jpg",
        )
        self.assertEqual(
            candidate.candidate_page_url,
            "https://www.amazon.co.uk/dp/B077V3XGG1",
        )
        self.assertIn("Amazon (amazon.co.uk)", candidate.source_name)
        self.assertIsNone(candidate.candidate_image_bytes)

    def test_result_without_image_is_skipped(self) -> None:
        provider = RainforestAmazonProvider(api_key="key", domains=["amazon.co.uk"])

        fake_payload = {
            "search_results": [
                {"title": "No image here", "link": "https://example.com"}
            ]
        }

        with mock.patch(
            "app.services.rainforest_amazon_visual_search.httpx.get",
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
        provider = RainforestAmazonProvider(api_key="key", domains=["amazon.co.uk"])

        long_title = "A" * 300
        fake_payload = {
            "search_results": [
                {
                    "title": long_title,
                    "link": "https://example.com",
                    "image": "https://example.com/image.jpg",
                }
            ]
        }

        with mock.patch(
            "app.services.rainforest_amazon_visual_search.httpx.get",
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
        provider = RainforestAmazonProvider(api_key="key")

        with mock.patch(
            "app.services.rainforest_amazon_visual_search.httpx.get"
        ) as mock_get:
            candidates = provider.find_candidates(
                asset_id=1,
                asset_title="   ",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        mock_get.assert_not_called()
        self.assertEqual(candidates, [])

    def test_failed_request_raises(self) -> None:
        provider = RainforestAmazonProvider(api_key="key", domains=["amazon.co.uk"])

        with mock.patch(
            "app.services.rainforest_amazon_visual_search.httpx.get",
            return_value=_FakeResponse(403, text="Forbidden"),
        ):
            with self.assertRaises(RuntimeError):
                provider.find_candidates(
                    asset_id=1,
                    asset_title="Anything",
                    reference_original_path=None,
                    reference_watermarked_path=None,
                )

    def test_multiple_domains_each_produce_a_request(self) -> None:
        provider = RainforestAmazonProvider(
            api_key="key", domains=["amazon.com", "amazon.co.uk"]
        )

        with mock.patch(
            "app.services.rainforest_amazon_visual_search.httpx.get",
            return_value=_FakeResponse(200, {"search_results": []}),
        ) as mock_get:
            provider.find_candidates(
                asset_id=1,
                asset_title="Anything",
                reference_original_path=None,
                reference_watermarked_path=None,
            )

        self.assertEqual(mock_get.call_count, 2)


if __name__ == "__main__":
    unittest.main()
