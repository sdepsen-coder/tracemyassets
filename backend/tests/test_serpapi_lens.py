import os
import unittest
from pathlib import Path
from unittest import mock

import httpx
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.models.base import Base
from app.models.provider_usage import ProviderUsage
from app.services import serpapi_lens_search as lens
from app.services.provider_budget import ProviderBudgetExceeded
from app.services.signed_image_links import is_valid
from app.services.visual_search_provider import (
    _build_provider,
    get_deep_scan_providers,
)

API_KEY = "sk-secret-serpapi-key-DO-NOT-LEAK"
SECRET = "unit-test-secret-key-0123456789abcdef0123456789"


def item(link, *, title="A title", image=None):
    result = {"link": link, "title": title}

    if image is not None:
        result["image"] = image

    return result


class ParsingTests(unittest.TestCase):
    def setUp(self) -> None:
        for name, value in (
            ("public_backend_url", "https://api.example.com"),
            ("frontend_url", "https://app.example.com"),
        ):
            patcher = mock.patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_pages_become_candidates_marked_as_index_results(self) -> None:
        found = lens.parse_exact_matches(
            {
                "exact_matches": [
                    item(
                        "https://www.shop.example/p/1",
                        title="Mug",
                        image="https://cdn.shop.example/1.jpg",
                    )
                ]
            }
        )

        self.assertEqual(len(found), 1)
        candidate = found[0]

        self.assertEqual(candidate.source_url, "https://www.shop.example/p/1")
        self.assertEqual(
            candidate.candidate_page_url, "https://www.shop.example/p/1"
        )
        self.assertEqual(
            candidate.candidate_image_url, "https://cdn.shop.example/1.jpg"
        )
        self.assertEqual(candidate.source_name, "shop.example: Mug")
        self.assertTrue(candidate.page_may_be_stale)

    def test_results_without_an_image_address_are_kept_but_come_last(
        self,
    ) -> None:
        found = lens.parse_exact_matches(
            {
                "exact_matches": [
                    item("https://a.example/no-image"),
                    item("https://b.example/with", image="https://b.example/i.jpg"),
                ]
            }
        )

        self.assertEqual(
            [c.candidate_page_url for c in found],
            ["https://b.example/with", "https://a.example/no-image"],
        )
        self.assertIsNone(found[1].candidate_image_url)

    def test_the_same_page_is_listed_once(self) -> None:
        found = lens.parse_exact_matches(
            {
                "exact_matches": [
                    item("https://a.example/p"),
                    item("https://a.example/p"),
                ]
            }
        )

        self.assertEqual(len(found), 1)

    def test_pinterest_country_hosts_fold_into_one_pin(self) -> None:
        found = lens.parse_exact_matches(
            {
                "exact_matches": [
                    item("https://es.pinterest.com/pin/123/"),
                    item("https://de.pinterest.com/pin/123/?x=1"),
                    item("https://www.pinterest.com/pin/123/"),
                    item("https://uk.pinterest.com/pin/999/"),
                ]
            }
        )

        self.assertEqual(
            [c.candidate_page_url for c in found],
            [
                "https://www.pinterest.com/pin/123/",
                "https://www.pinterest.com/pin/999/",
            ],
        )
        self.assertTrue(
            all(c.source_name.startswith("pinterest.com") for c in found)
        )

    def test_google_and_our_own_servers_are_skipped(self) -> None:
        found = lens.parse_exact_matches(
            {
                "exact_matches": [
                    item("https://www.google.com/search?q=x"),
                    item("https://images.google.co.uk/x"),
                    item("https://api.example.com/api/v1/public/asset-image/1/2/3.png"),
                    item("https://app.example.com/matches"),
                    item("https://keep.example/p"),
                ]
            }
        )

        self.assertEqual(
            [c.candidate_page_url for c in found], ["https://keep.example/p"]
        )

    def test_malformed_items_are_ignored(self) -> None:
        found = lens.parse_exact_matches(
            {
                "exact_matches": [
                    "just a string",
                    None,
                    {},
                    {"link": 42},
                    {"link": "ftp://old.example/file"},
                    {"link": "javascript:alert(1)"},
                    item("https://ok.example/p", image="not a url"),
                ]
            }
        )

        self.assertEqual(len(found), 1)
        self.assertIsNone(found[0].candidate_image_url)

    def test_missing_or_null_list_is_empty(self) -> None:
        self.assertEqual(lens.parse_exact_matches({}), [])
        self.assertEqual(
            lens.parse_exact_matches({"exact_matches": None}), []
        )

    def test_the_number_of_candidates_is_capped(self) -> None:
        many = [item(f"https://h{i}.example/p") for i in range(100)]

        found = lens.parse_exact_matches({"exact_matches": many})

        self.assertEqual(len(found), lens.MAX_CANDIDATES)


class LabelTests(unittest.TestCase):
    def test_etsy_gets_the_generic_label_without_a_title(self) -> None:
        self.assertEqual(
            lens.source_label("https://www.etsy.com/listing/1/x", "Secret title"),
            "Etsy listing",
        )

    def test_other_sites_get_host_and_title(self) -> None:
        self.assertEqual(
            lens.source_label("https://www.amazon.co.uk/dp/B0", "A  mug\n"),
            "amazon.co.uk: A mug",
        )

    def test_no_title_leaves_just_the_host(self) -> None:
        self.assertEqual(
            lens.source_label("https://blog.example/post", ""), "blog.example"
        )

    def test_long_titles_fit_the_column(self) -> None:
        label = lens.source_label("https://x.example/p", "word " * 100)

        self.assertLessEqual(len(label), 100)

    def test_canonical_url_only_touches_pinterest(self) -> None:
        self.assertEqual(
            lens.canonical_page_url("https://shop.example/a?b=1#c"),
            "https://shop.example/a?b=1#c",
        )
        self.assertEqual(
            lens.canonical_page_url("https://in.pinterest.com/pin/5/"),
            "https://www.pinterest.com/pin/5/",
        )


def make_session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    return sessionmaker(bind=engine)


class ProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        env = mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": SECRET})
        env.start()
        self.addCleanup(env.stop)

        for name, value in (
            ("public_backend_url", "https://api.example.com"),
            ("frontend_url", "https://app.example.com"),
            ("serpapi_daily_limit", 2),
            ("serpapi_monthly_limit", 100),
        ):
            patcher = mock.patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

        self.session_factory = make_session_factory()
        self.requests: list[httpx.Request] = []
        self.reply = {"exact_matches": []}
        self.status = 200

    def _provider(self, handler=None) -> lens.SerpApiLensProvider:
        def default(request: httpx.Request) -> httpx.Response:
            self.requests.append(request)

            return httpx.Response(self.status, json=self.reply)

        client = httpx.Client(transport=httpx.MockTransport(handler or default))
        self.addCleanup(client.close)

        return lens.SerpApiLensProvider(
            api_key=API_KEY,
            client=client,
            session_factory=self.session_factory,
        )

    def _find(self, provider, asset_id=7):
        return provider.find_candidates(
            asset_id=asset_id,
            asset_title="Title",
            reference_original_path=Path("original.png"),
            reference_watermarked_path=None,
        )

    def _usage(self):
        db = self.session_factory()
        self.addCleanup(db.close)

        return list(db.scalars(select(ProviderUsage)))

    def test_it_asks_lens_for_exact_matches_of_a_signed_link(self) -> None:
        self.reply = {
            "exact_matches": [
                item("https://shop.example/p", image="https://shop.example/i.jpg")
            ]
        }

        found = self._find(self._provider())

        self.assertEqual(len(found), 1)
        self.assertEqual(len(self.requests), 1)

        params = dict(self.requests[0].url.params)

        self.assertEqual(params["engine"], "google_lens")
        self.assertEqual(params["type"], "exact_matches")
        self.assertEqual(params["api_key"], API_KEY)

        prefix = "https://api.example.com/api/v1/public/asset-image/7/"

        self.assertTrue(params["url"].startswith(prefix))

        expires, signature = params["url"][len(prefix):-len(".png")].split("/")

        self.assertTrue(is_valid(7, int(expires), signature))

    def test_each_search_is_counted_with_its_artwork(self) -> None:
        self._find(self._provider(), asset_id=7)

        rows = self._usage()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].provider, "serpapi")
        self.assertEqual(rows[0].asset_id, 7)

    def test_a_search_with_no_results_is_not_an_error(self) -> None:
        self.reply = {"error": "Google hasn't returned any results for this query."}

        self.assertEqual(self._find(self._provider()), [])
        # The search still happened, so it still counts.
        self.assertEqual(len(self._usage()), 1)

    def test_other_api_errors_are_raised(self) -> None:
        self.reply = {"error": "Invalid API key."}

        with self.assertRaises(lens.LensSearchError) as caught:
            self._find(self._provider())

        self.assertIn("Invalid API key", str(caught.exception))

    def test_an_http_failure_never_leaks_the_api_key(self) -> None:
        self.status = 500

        with self.assertRaises(lens.LensSearchError) as caught:
            self._find(self._provider())

        error = caught.exception

        self.assertIn("500", str(error))
        self.assertNotIn(API_KEY, str(error))
        # The original httpx error carries the URL (and key) and
        # tracebacks print the chain, so it must be cut off.
        self.assertIsNone(error.__cause__)
        self.assertTrue(error.__suppress_context__)

    def test_a_network_failure_never_leaks_the_api_key(self) -> None:
        def boom(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectTimeout(f"timed out for {request.url}")

        with self.assertRaises(lens.LensSearchError) as caught:
            self._find(self._provider(boom))

        self.assertNotIn(API_KEY, str(caught.exception))
        self.assertIsNone(caught.exception.__cause__)

    def test_a_reply_that_is_not_json_is_an_error(self) -> None:
        def html(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, text="<html>nope</html>")

        with self.assertRaises(lens.LensSearchError):
            self._find(self._provider(html))

    def test_a_spent_allowance_stops_the_search_before_any_request(self) -> None:
        provider = self._provider()

        self._find(provider)
        self._find(provider)

        with self.assertRaises(ProviderBudgetExceeded):
            self._find(provider)

        self.assertEqual(len(self.requests), 2)
        self.assertEqual(len(self._usage()), 2)

    def test_without_a_public_address_nothing_is_spent(self) -> None:
        provider = self._provider()

        with mock.patch.object(settings, "public_backend_url", ""):
            with self.assertRaises(RuntimeError):
                self._find(provider)

        self.assertEqual(self.requests, [])
        self.assertEqual(self._usage(), [])

    def test_without_an_api_key_it_cannot_be_built(self) -> None:
        with mock.patch.object(settings, "serpapi_api_key", ""):
            with self.assertRaises(RuntimeError):
                lens.SerpApiLensProvider()


class RegistryTests(unittest.TestCase):
    def test_lens_cannot_be_listed_among_the_ordinary_providers(self) -> None:
        with self.assertRaises(RuntimeError) as caught:
            _build_provider("serpapi-lens")

        self.assertIn("deep scans", str(caught.exception))

    def test_deep_scan_needs_the_api_key(self) -> None:
        with mock.patch.object(settings, "serpapi_api_key", ""), mock.patch.object(
            settings, "public_backend_url", "https://api.example.com"
        ):
            with self.assertRaises(RuntimeError) as caught:
                get_deep_scan_providers()

        self.assertIn("SERPAPI_API_KEY", str(caught.exception))

    def test_deep_scan_needs_the_public_address(self) -> None:
        with mock.patch.object(settings, "serpapi_api_key", API_KEY), mock.patch.object(
            settings, "public_backend_url", ""
        ):
            with self.assertRaises(RuntimeError) as caught:
                get_deep_scan_providers()

        self.assertIn("PUBLIC_BACKEND_URL", str(caught.exception))

    def test_configured_deep_scan_uses_lens(self) -> None:
        with mock.patch.object(settings, "serpapi_api_key", API_KEY), mock.patch.object(
            settings, "public_backend_url", "https://api.example.com"
        ):
            providers = get_deep_scan_providers()

        self.assertEqual([p.name for p in providers], ["serpapi-lens"])


if __name__ == "__main__":
    unittest.main()
