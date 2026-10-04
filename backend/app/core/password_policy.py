"""
Password rules: at least 8 characters, and not one of the passwords
attackers try first. Length alone is weak at 8, so the common-password
check is what keeps the shorter minimum reasonable.
"""

from __future__ import annotations

MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

# Passwords that satisfy "8+ characters" yet appear at the top of every
# leaked-password list. Compared case-insensitively.
_COMMON_PASSWORDS = frozenset(
    """
    password password1 password12 password123 password1234 passw0rd p@ssw0rd
    p@ssword 12345678 123456789 1234567890 12345678910 123123123 11111111
    00000000 87654321 987654321 123456123456 qwertyui qwerty123 qwerty1234
    qwertyuiop qwertyuiop123 asdfghjk asdfghjkl zxcvbnm1 1q2w3e4r 1q2w3e4r5t
    1qaz2wsx 1qaz2wsx3edc q1w2e3r4 qazwsxedc iloveyou iloveyou1 iloveyou123
    letmein1 letmein123 welcome1 welcome12 welcome123 admin123 admin1234
    administrator abc12345 abcd1234 abcdefgh abcdefgh1 monkey123 dragon123
    football football1 baseball baseball1 superman master123 trustno1
    sunshine sunshine1 princess princess1 shadow123 michael1 jennifer1
    starwars changeme changeme1 default123 test1234 testtest tracemyassets
    tracemyassets1 tracemyassets123 artist123 artwork123 turkiye1 istanbul34
    ankara0606 galatasaray fenerbahce besiktas1
    """.split()
)


def check_password(password: str, *, email: str | None = None) -> str | None:
    """Returns a user-facing reason the password is refused, or None."""
    if len(password) < MIN_PASSWORD_LENGTH:
        return (
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
        )

    if len(password) > MAX_PASSWORD_LENGTH:
        return (
            f"Password must be at most {MAX_PASSWORD_LENGTH} characters."
        )

    lowered = password.lower()

    if lowered in _COMMON_PASSWORDS:
        return "That password is too common. Please choose another."

    if len(set(lowered)) == 1:
        return "Password must not be a single repeated character."

    if email:
        local_part = email.strip().lower().split("@", 1)[0]

        if len(local_part) >= 4 and lowered in {local_part, email.lower()}:
            return "Password must not be the same as your email."

    return None
