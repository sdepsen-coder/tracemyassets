import unittest

import httpx

from app.services.page_check import (
    PageStatus,
    check_candidate_page,
    is_trusted_marketplace,
    page_references_image,
    should_show_match,
)
from app.services.safe_fetch import (
    FetchResult,
    UnsafeUrlError,
    assert_public_http_url,
)

IMAGE = "https://cdn.shop.example/images/abcdef123456.jpg"


def _fetcher(status: int, body: str = ""):
    def fetch(url: str) -> FetchResult:
        return FetchResult(
            status_code=status, content=body.encode(), final_url=url
        )

    return fetch


def _raising(exc: Exception):
    def fetch(url: str) -> FetchResult:
        raise exc

    return fetch


class CheckCandidatePageTests(unittest.TestCase):
    def check(self, fetcher, image=IMAGE):
        return check_candidate_page(
            "https://shop.example/p/1", image, fetcher=fetcher
        )

    def test_404_and_410_are_gone(self) -> None:
        self.assertIs(self.check(_fetcher(404)), PageStatus.GONE)
        self.assertIs(self.check(_fetcher(410)), PageStatus.GONE)

    def test_bot_blocks_and_server_errors_are_not_treated_as_gone(self) -> None:
        for status in (401, 403, 429, 500, 503):
            self.assertIs(self.check(_fetcher(status)), PageStatus.BLOCKED)

    def test_other_client_errors_are_gone(self) -> None:
        self.assertIs(self.check(_fetcher(400)), PageStatus.GONE)

    def test_page_that_references_the_image_is_confirmed(self) -> None:
        html = '<html><img src="//cdn.shop.example/images/abcdef123456.jpg"></html>'
        self.assertIs(self.check(_fetcher(200, html)), PageStatus.CONFIRMED)

    def test_image_referenced_by_filename_only_is_confirmed(self) -> None:
        html = '<img src="/media/abcdef123456_600x600.jpg">'
        self.assertIs(self.check(_fetcher(200, html)), PageStatus.CONFIRMED)

    def test_reachable_page_without_the_image_is_unconfirmed(self) -> None:
        html = "<html><h1>No result found</h1></html>"
        self.assertIs(self.check(_fetcher(200, html)), PageStatus.UNCONFIRMED)

    def test_escaped_json_urls_are_recognised(self) -> None:
        html = '{"image":"https:\\/\\/cdn.shop.example\\/images\\/abcdef123456.jpg"}'
        self.assertIs(self.check(_fetcher(200, html)), PageStatus.CONFIRMED)

    def test_dns_failure_and_connection_refused_are_gone(self) -> None:
        import socket

        self.assertIs(
            self.check(_raising(socket.gaierror("no such host"))),
            PageStatus.GONE,
        )
        self.assertIs(
            self.check(_raising(httpx.ConnectError("refused"))),
            PageStatus.GONE,
        )

    def test_timeout_is_blocked_not_gone(self) -> None:
        self.assertIs(
            self.check(_raising(httpx.ReadTimeout("slow"))),
            PageStatus.BLOCKED,
        )

    def test_unsafe_url_is_gone(self) -> None:
        self.assertIs(
            self.check(_raising(UnsafeUrlError("private"))), PageStatus.GONE
        )


class ShowPolicyTests(unittest.TestCase):
    def test_gone_is_never_shown(self) -> None:
        self.assertFalse(
            should_show_match("https://www.amazon.com.au/dp/X", PageStatus.GONE)
        )

    def test_confirmed_and_blocked_are_shown(self) -> None:
        self.assertTrue(
            should_show_match("https://unknown.example/a", PageStatus.CONFIRMED)
        )
        self.assertTrue(
            should_show_match("https://unknown.example/a", PageStatus.BLOCKED)
        )

    def test_unconfirmed_is_shown_only_for_trusted_marketplaces(self) -> None:
        self.assertTrue(
            should_show_match(
                "https://www.amazon.com.au/dp/X", PageStatus.UNCONFIRMED
            )
        )
        self.assertFalse(
            should_show_match(
                "https://masonbrosquarryproducts.co.uk/Boots-1",
                PageStatus.UNCONFIRMED,
            )
        )

    def test_marketplace_matching_is_not_fooled_by_lookalike_hosts(self) -> None:
        self.assertTrue(is_trusted_marketplace("https://www.etsy.com/listing/1"))
        self.assertTrue(is_trusted_marketplace("https://smile.amazon.co.uk/dp/1"))
        self.assertFalse(is_trusted_marketplace("https://amazon.evil.example/1"))
        self.assertFalse(is_trusted_marketplace("https://notetsy.com/1"))
        self.assertFalse(is_trusted_marketplace("https://amazon.com.evil.example/1"))


class PageReferencesImageTests(unittest.TestCase):
    def test_short_filenames_need_the_whole_name(self) -> None:
        self.assertFalse(
            page_references_image(
                "<p>nothing here</p>", "https://x.example/img/1.jpg"
            )
        )
        self.assertTrue(
            page_references_image('<img src="/img/1.jpg">', "https://x.example/img/1.jpg")
        )


class SafeFetchGuardTests(unittest.TestCase):
    def test_rejects_non_http_schemes(self) -> None:
        for url in ("file:///etc/passwd", "ftp://example.com/x", "gopher://x"):
            with self.assertRaises(UnsafeUrlError):
                assert_public_http_url(url)

    def test_rejects_loopback_and_private_and_metadata_addresses(self) -> None:
        for url in (
            "http://127.0.0.1/",
            "http://localhost/",
            "http://10.0.0.5/admin",
            "http://192.168.1.1/",
            "http://169.254.169.254/latest/meta-data/",
            "http://[::1]/",
        ):
            with self.assertRaises(UnsafeUrlError, msg=url):
                assert_public_http_url(url)

    def test_accepts_a_public_ip_literal(self) -> None:
        assert_public_http_url("http://93.184.216.34/")


if __name__ == "__main__":
    unittest.main()


class ResizedAndEncodedImageTests(unittest.TestCase):
    def test_wordpress_thumbnail_and_encoded_dash_are_recognised(self) -> None:
        from app.services.page_check import page_references_image

        original = (
            "https://shop.example/wp-content/uploads/2026/02/"
            "Royal-Bathroom-Duck-Poster-%E2%80%93-Mizahi-Duvar-Tablosu-1.webp"
        )
        html = (
            '<img src="https://shop.example/wp-content/uploads/2026/02/'
            'Royal-Bathroom-Duck-Poster-–-Mizahi-Duvar-Tablosu-1-350x467.webp">'
        )

        self.assertTrue(page_references_image(html, original))

    def test_unrelated_thumbnail_is_not_recognised(self) -> None:
        from app.services.page_check import page_references_image

        original = "https://shop.example/uploads/Royal-Bathroom-Duck-Poster-1.webp"
        html = '<img src="https://shop.example/uploads/Other-Product-Name-1-350x467.webp">'

        self.assertFalse(page_references_image(html, original))
