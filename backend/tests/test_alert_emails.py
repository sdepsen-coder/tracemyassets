import unittest
from unittest import mock

import httpx

from app.services import email_service
from app.services.alert_emails import build_new_match_alert


class BuildAlertTests(unittest.TestCase):
    def test_message_has_count_link_and_no_source_urls(self) -> None:
        subject, html, text = build_new_match_alert(
            asset_title="Duck Poster", new_match_count=2
        )

        self.assertIn("2 new possible matches", subject)
        self.assertIn("/matches", html)
        self.assertIn("/matches", text)
        self.assertNotIn("http://shop", html)

    def test_singular_wording(self) -> None:
        subject, _, _ = build_new_match_alert(
            asset_title="Duck", new_match_count=1
        )

        self.assertIn("1 new possible match ", subject + " ")
        self.assertNotIn("matches", subject)

    def test_title_is_html_escaped(self) -> None:
        _, html, _ = build_new_match_alert(
            asset_title="<script>alert(1)</script>", new_match_count=1
        )

        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)


class SendEmailTests(unittest.TestCase):
    def send(self):
        return email_service.send_email(
            to="a@example.com", subject="s", html="<p>h</p>", text="t"
        )

    def test_without_api_key_nothing_is_sent(self) -> None:
        with mock.patch.object(
            email_service.settings, "resend_api_key", ""
        ), mock.patch("app.services.email_service.httpx.post") as post:
            self.assertFalse(self.send())

        post.assert_not_called()

    def test_success_returns_true(self) -> None:
        with mock.patch.object(
            email_service.settings, "resend_api_key", "key"
        ), mock.patch(
            "app.services.email_service.httpx.post",
            return_value=httpx.Response(200, json={"id": "1"}),
        ) as post:
            self.assertTrue(self.send())

        self.assertEqual(
            post.call_args.kwargs["headers"]["Authorization"], "Bearer key"
        )
        self.assertEqual(post.call_args.kwargs["json"]["to"], ["a@example.com"])

    def test_provider_error_and_network_error_never_raise(self) -> None:
        with mock.patch.object(
            email_service.settings, "resend_api_key", "key"
        ):
            with mock.patch(
                "app.services.email_service.httpx.post",
                return_value=httpx.Response(403, text="nope"),
            ):
                self.assertFalse(self.send())

            with mock.patch(
                "app.services.email_service.httpx.post",
                side_effect=httpx.ConnectError("down"),
            ):
                self.assertFalse(self.send())


if __name__ == "__main__":
    unittest.main()
