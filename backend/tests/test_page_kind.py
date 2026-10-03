import unittest

from app.services.page_kind import classify_page


class PageKindTests(unittest.TestCase):
    def test_no_page_means_image_only(self) -> None:
        self.assertEqual(classify_page(None), "image_only")
        self.assertEqual(classify_page(""), "image_only")
        self.assertEqual(classify_page("   "), "image_only")

    def test_etsy_listing_is_an_item_page(self) -> None:
        self.assertEqual(
            classify_page(
                "https://www.etsy.com/listing/4443562820/relief-cat-ceramic"
            ),
            "item",
        )
        self.assertEqual(
            classify_page("https://www.etsy.com/uk/listing/123/x?ref=a"),
            "item",
        )

    def test_etsy_market_search_and_shop_are_collections(self) -> None:
        for url in (
            "https://www.etsy.com/market/8_oz_espresso_cup",
            "https://www.etsy.com/uk/market/8oz_ceramic_mug",
            "https://www.etsy.com/search?q=cat+mug",
            "https://www.etsy.com/shop/SomeShop",
            "https://www.etsy.com/c/home-and-living/kitchen",
        ):
            self.assertEqual(classify_page(url), "collection", url)

    def test_pinterest_pin_is_an_item_everything_else_a_collection(self) -> None:
        self.assertEqual(
            classify_page("https://www.pinterest.com/pin/222/"), "item"
        )
        self.assertEqual(
            classify_page("https://es.pinterest.com/pin/222/"), "item"
        )

        for url in (
            "https://www.pinterest.com/ideas/things-to-paint-on-mugs/897505491976/",
            "https://pt.pinterest.com/tracyd55/house/",
            "https://www.pinterest.com/someone/",
        ):
            self.assertEqual(classify_page(url), "collection", url)

    def test_amazon_product_and_search_pages(self) -> None:
        self.assertEqual(
            classify_page("https://www.amazon.co.uk/dp/B077V3XGG1"), "item"
        )
        self.assertEqual(
            classify_page("https://www.amazon.co.uk/s?k=mug"), "collection"
        )

    def test_other_sites_are_plain_pages(self) -> None:
        self.assertEqual(
            classify_page("https://shop.example/product/1"), "page"
        )

    def test_lookalike_hosts_are_not_mistaken_for_the_marketplace(self) -> None:
        # "etsy.com" must be the real domain or a subdomain of it.
        self.assertEqual(
            classify_page("https://notetsy.com/listing/1"), "page"
        )
        self.assertEqual(
            classify_page("https://etsy.com.evil.example/listing/1"), "page"
        )

    def test_garbage_does_not_raise(self) -> None:
        self.assertEqual(classify_page("http://[bad"), "page")



class PageKindInResponseTests(unittest.TestCase):
    def _record(self, page_url):
        from datetime import datetime, timezone
        from types import SimpleNamespace

        now = datetime(2026, 10, 3, tzinfo=timezone.utc)

        return SimpleNamespace(
            id=1,
            asset_id=1,
            scan_job_id=1,
            source_name="Etsy listing",
            source_url=page_url,
            candidate_image_url="https://i.etsystatic.com/a.jpg",
            candidate_page_url=page_url,
            candidate_image_hash="fcc3a23cd5326ac1",
            similarity_percent=97.0,
            watermark_verified=False,
            watermark_matches_reference=False,
            overall_signal="STRONG_VISUAL_MATCH",
            review_status="new",
            found_at=now,
            reviewed_at=None,
            dismissed_at=None,
            notes=None,
            created_at=now,
            updated_at=now,
        )

    def test_kind_is_exposed_even_when_the_source_is_locked(self) -> None:
        from app.services.match_presentation import build_match_record_response

        record = self._record("https://www.etsy.com/market/8_oz_espresso_cup")

        locked = build_match_record_response(record, plan_type="free")

        self.assertTrue(locked.source_locked)
        self.assertIsNone(locked.candidate_page_url)
        self.assertEqual(locked.page_kind, "collection")

        unlocked = build_match_record_response(record, plan_type="internal")

        self.assertEqual(unlocked.page_kind, "collection")

    def test_a_match_without_a_page_is_image_only(self) -> None:
        from app.services.match_presentation import build_match_record_response

        response = build_match_record_response(
            self._record(None), plan_type="internal"
        )

        self.assertEqual(response.page_kind, "image_only")


if __name__ == "__main__":
    unittest.main()
