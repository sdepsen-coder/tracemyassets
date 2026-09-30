import json
import unittest

from app.services.page_check import PageStatus
from app.services.page_images import extract_image_urls, read_page_images
from app.services.safe_fetch import FetchResult

BASE = "https://shop.example/listing/1"


class ExtractImageUrlsTests(unittest.TestCase):
    def test_social_preview_image_comes_first(self) -> None:
        html = """
        <html><head>
          <meta property="og:image" content="https://cdn.example/main.jpg">
        </head><body>
          <img src="/thumbs/other.jpg">
        </body></html>"""

        urls = extract_image_urls(html, BASE)

        self.assertEqual(urls[0], "https://cdn.example/main.jpg")
        self.assertIn("https://shop.example/thumbs/other.jpg", urls)

    def test_relative_and_protocol_relative_urls_are_resolved(self) -> None:
        html = '<img src="//cdn.example/a.jpg"><img src="b.jpg">'

        urls = extract_image_urls(html, BASE)

        self.assertIn("https://cdn.example/a.jpg", urls)
        self.assertIn("https://shop.example/listing/b.jpg", urls)

    def test_json_ld_images_are_found(self) -> None:
        document = {"@type": "Product", "image": ["https://cdn.example/p1.jpg"]}
        html = (
            '<script type="application/ld+json">'
            + json.dumps(document)
            + "</script>"
        )

        self.assertEqual(
            extract_image_urls(html, BASE), ["https://cdn.example/p1.jpg"]
        )

    def test_largest_srcset_entry_is_used(self) -> None:
        html = '<img srcset="/s.jpg 300w, /l.jpg 1200w, /m.jpg 600w">'

        self.assertEqual(
            extract_image_urls(html, BASE),
            ["https://shop.example/l.jpg"],
        )

    def test_icons_logos_svgs_and_gifs_are_skipped(self) -> None:
        html = """
        <img src="/static/logo.png"><img src="/a.svg"><img src="/spin.gif">
        <img src="/favicon.ico"><img src="/art/real.jpg">"""

        self.assertEqual(
            extract_image_urls(html, BASE), ["https://shop.example/art/real.jpg"]
        )

    def test_non_http_and_duplicates_are_dropped_and_limit_applies(self) -> None:
        html = (
            '<img src="data:image/png;base64,AAAA">'
            '<img src="javascript:alert(1)">'
            '<img src="/1.jpg"><img src="/1.jpg"><img src="/2.jpg">'
            '<img src="/3.jpg"><img src="/4.jpg">'
        )

        urls = extract_image_urls(html, BASE, limit=3)

        self.assertEqual(len(urls), 3)
        self.assertEqual(len(set(urls)), 3)

    def test_malformed_html_does_not_raise(self) -> None:
        extract_image_urls("<img src=<<<>>> <meta", BASE)


class ReadPageImagesTests(unittest.TestCase):
    def test_gone_and_blocked_pages_report_why(self) -> None:
        def fetcher(status):
            return lambda url: FetchResult(status, b"", url)

        self.assertEqual(
            read_page_images(BASE, fetcher=fetcher(404)), (PageStatus.GONE, [])
        )
        self.assertEqual(
            read_page_images(BASE, fetcher=fetcher(403)),
            (PageStatus.BLOCKED, []),
        )

    def test_readable_page_returns_images(self) -> None:
        body = b'<meta property="og:image" content="https://cdn.example/x.jpg">'

        failure, urls = read_page_images(
            BASE, fetcher=lambda url: FetchResult(200, body, url)
        )

        self.assertIsNone(failure)
        self.assertEqual(urls, ["https://cdn.example/x.jpg"])


if __name__ == "__main__":
    unittest.main()
