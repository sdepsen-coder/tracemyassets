"""
Manual admin script: give a user deep scan credits.

There is no payment flow yet -- during the beta, credits are added by
hand. Run from the backend directory with the venv active:

    .\\.venv\\Scripts\\python.exe scripts\\grant_credits.py someone@example.com 5 "second batch"

Usage: python scripts/grant_credits.py <email> <number of credits> [note]
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.session import SessionLocal
from app.models.user import User
from app.services.credits import (
    ensure_welcome_grant,
    get_balance,
    grant_credits,
)


def main() -> None:
    if len(sys.argv) not in (3, 4):
        print(f"Usage: python {sys.argv[0]} <email> <credits> [note]")
        raise SystemExit(1)

    email = sys.argv[1]

    try:
        amount = int(sys.argv[2])
    except ValueError:
        print(f"{sys.argv[2]!r} is not a whole number.")
        raise SystemExit(1)

    if amount <= 0:
        print("The number of credits must be positive.")
        raise SystemExit(1)

    note = sys.argv[3] if len(sys.argv) == 4 else None

    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).one_or_none()

        if user is None:
            print(f"No user found with email {email!r}.")
            raise SystemExit(1)

        # So the welcome credits are not given on top later by surprise.
        ensure_welcome_grant(db, user.id)
        db.commit()

        before = get_balance(db, user.id)

        grant_credits(db, user_id=user.id, amount=amount, note=note)

        print(f"{email}: {before} -> {get_balance(db, user.id)} credits")
    finally:
        db.close()


if __name__ == "__main__":
    main()
