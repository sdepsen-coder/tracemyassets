import unittest
from unittest import mock

from app.core import monitoring


class ScrubEventTests(unittest.TestCase):
    def test_personal_and_secret_parts_are_removed(self) -> None:
        event = {
            "request": {
                "url": "https://api.example.com/x?token=SECRET",
                "query_string": "token=SECRET",
                "data": {"password": "hunter2"},
                "cookies": {"tma_session": "abc"},
                "headers": {
                    "Authorization": "Bearer abc",
                    "Cookie": "tma_session=abc",
                    "User-Agent": "test",
                },
            },
            "user": {"email": "a@b.c", "ip_address": "1.2.3.4"},
            "message": "boom",
        }

        out = monitoring.scrub_event(event)

        self.assertEqual(out["request"]["url"], "https://api.example.com/x")
        self.assertNotIn("query_string", out["request"])
        self.assertNotIn("data", out["request"])
        self.assertNotIn("cookies", out["request"])
        self.assertEqual(out["request"]["headers"], {"User-Agent": "test"})
        self.assertNotIn("user", out)
        self.assertEqual(out["message"], "boom")

    def test_events_without_a_request_pass_through(self) -> None:
        self.assertEqual(monitoring.scrub_event({"message": "x"}), {"message": "x"})


class InitTests(unittest.TestCase):
    def test_nothing_starts_without_a_dsn(self) -> None:
        with mock.patch.object(monitoring.settings, "sentry_dsn", ""):
            self.assertFalse(monitoring.init_monitoring())

    def test_starts_with_a_dsn_and_no_personal_data(self) -> None:
        with mock.patch.object(
            monitoring.settings, "sentry_dsn", "https://k@o0.ingest.sentry.io/1"
        ), mock.patch("sentry_sdk.init") as init:
            self.assertTrue(monitoring.init_monitoring())

        kwargs = init.call_args.kwargs
        self.assertIs(kwargs["send_default_pii"], False)
        self.assertIs(kwargs["before_send"], monitoring.scrub_event)
