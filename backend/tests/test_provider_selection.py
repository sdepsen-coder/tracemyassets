import unittest
from unittest import mock

from app.core.config import settings
from app.services.fake_visual_search import FakeVisualSearchProvider
from app.services.visual_search_provider import (
    get_configured_provider,
    get_configured_providers,
    truncate_source_name,
)


class GetConfiguredProvidersTests(unittest.TestCase):
    def test_defaults_to_a_single_fake_provider(self) -> None:
        with mock.patch.object(settings, "visual_search_provider", ""):
            providers = get_configured_providers()

        self.assertEqual(len(providers), 1)
        self.assertIsInstance(providers[0], FakeVisualSearchProvider)

    def test_comma_separated_names_build_one_provider_each(self) -> None:
        with mock.patch.object(
            settings, "visual_search_provider", "fake, fake"
        ):
            providers = get_configured_providers()

        self.assertEqual(len(providers), 2)
        self.assertTrue(all(p.name == "fake" for p in providers))

    def test_unknown_provider_name_raises(self) -> None:
        with mock.patch.object(settings, "visual_search_provider", "not-a-real-provider"):
            with self.assertRaises(RuntimeError):
                get_configured_providers()

    def test_rainforest_amazon_without_api_key_raises_with_a_clear_message(
        self,
    ) -> None:
        with mock.patch.object(
            settings, "visual_search_provider", "rainforest-amazon"
        ):
            with mock.patch.dict("os.environ", {}, clear=True):
                with self.assertRaises(RuntimeError) as ctx:
                    get_configured_providers()

        self.assertIn("RAINFOREST_API_KEY", str(ctx.exception))

    def test_etsy_without_api_key_raises_with_a_clear_message(self) -> None:
        with mock.patch.object(settings, "visual_search_provider", "etsy"):
            with mock.patch.dict("os.environ", {}, clear=True):
                with self.assertRaises(RuntimeError) as ctx:
                    get_configured_providers()

        self.assertIn("ETSY_API_KEY", str(ctx.exception))

    def test_get_configured_provider_returns_the_first_of_several(self) -> None:
        with mock.patch.object(
            settings, "visual_search_provider", "fake, fake"
        ):
            provider = get_configured_provider()

        self.assertIsInstance(provider, FakeVisualSearchProvider)


class TruncateSourceNameTests(unittest.TestCase):
    def test_short_text_is_unchanged(self) -> None:
        self.assertEqual(truncate_source_name("Amazon: mug"), "Amazon: mug")

    def test_long_text_is_clipped_to_the_limit(self) -> None:
        long_title = "Amazon: " + "x" * 200

        result = truncate_source_name(long_title)

        self.assertEqual(len(result), 100)
        self.assertTrue(result.endswith("…"))


if __name__ == "__main__":
    unittest.main()
