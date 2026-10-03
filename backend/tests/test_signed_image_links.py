import hashlib
import hmac
import os
import unittest
from unittest import mock

from app.core.config import settings
from app.services import signed_image_links as links

SECRET = "unit-test-secret-key-0123456789abcdef0123456789"
NOW = 1_800_000_000.0


class SignedImageLinkTests(unittest.TestCase):
    def setUp(self) -> None:
        patcher = mock.patch.dict(os.environ, {"AUTH_SECRET_KEY": SECRET})
        patcher.start()
        self.addCleanup(patcher.stop)

        base = mock.patch.object(
            settings, "public_backend_url", "https://api.example.com"
        )
        base.start()
        self.addCleanup(base.stop)

    def test_a_fresh_link_is_valid(self) -> None:
        expires = int(NOW) + 300
        signature = links.sign(7, expires)

        self.assertTrue(links.is_valid(7, expires, signature, now=NOW))

    def test_signing_is_stable(self) -> None:
        self.assertEqual(links.sign(7, 123), links.sign(7, 123))

    def test_a_tampered_signature_is_refused(self) -> None:
        expires = int(NOW) + 300
        signature = links.sign(7, expires)
        tampered = ("0" if signature[0] != "0" else "1") + signature[1:]

        self.assertFalse(links.is_valid(7, expires, tampered, now=NOW))

    def test_a_link_is_good_for_one_artwork_only(self) -> None:
        expires = int(NOW) + 300
        signature = links.sign(7, expires)

        self.assertFalse(links.is_valid(8, expires, signature, now=NOW))

    def test_a_link_cannot_be_given_a_longer_life(self) -> None:
        expires = int(NOW) + 300
        signature = links.sign(7, expires)

        self.assertFalse(
            links.is_valid(7, expires + 3600, signature, now=NOW)
        )

    def test_an_expired_link_is_refused(self) -> None:
        expires = int(NOW) - 1
        signature = links.sign(7, expires)

        self.assertFalse(links.is_valid(7, expires, signature, now=NOW))

    def test_an_absurdly_distant_expiry_is_refused_even_if_signed(self) -> None:
        expires = int(NOW) + links.LINK_TTL_SECONDS + 3600
        signature = links.sign(7, expires)

        self.assertFalse(links.is_valid(7, expires, signature, now=NOW))

    def test_garbage_is_refused(self) -> None:
        self.assertFalse(links.is_valid(7, int(NOW) + 60, "", now=NOW))
        self.assertFalse(
            links.is_valid(7, int(NOW) + 60, "not-a-signature", now=NOW)
        )

    def test_the_signature_is_not_a_plain_hmac_of_the_login_secret(self) -> None:
        expires = 123
        plain = hmac.new(
            SECRET.encode(), f"7:{expires}".encode(), hashlib.sha256
        ).hexdigest()

        self.assertNotEqual(links.sign(7, expires), plain)

    def test_a_different_secret_gives_different_signatures(self) -> None:
        first = links.sign(7, 123)

        with mock.patch.dict(
            os.environ, {"AUTH_SECRET_KEY": SECRET + "-changed"}
        ):
            second = links.sign(7, 123)

        self.assertNotEqual(first, second)

    def test_built_url_points_at_the_public_backend_and_validates(self) -> None:
        url = links.build_public_image_url(7, now=NOW)

        prefix = "https://api.example.com/api/v1/public/asset-image/7/"

        self.assertTrue(url.startswith(prefix))
        self.assertTrue(url.endswith(".png"))

        expires, signature = url[len(prefix):-len(".png")].split("/")

        self.assertEqual(int(expires), int(NOW) + links.LINK_TTL_SECONDS)
        self.assertTrue(
            links.is_valid(7, int(expires), signature, now=NOW)
        )

    def test_building_needs_the_public_backend_address(self) -> None:
        with mock.patch.object(settings, "public_backend_url", ""):
            with self.assertRaises(RuntimeError):
                links.build_public_image_url(7)


if __name__ == "__main__":
    unittest.main()
