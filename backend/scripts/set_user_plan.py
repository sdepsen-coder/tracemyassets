"""
Manual admin script: change a user's plan_type.

There is no self-serve upgrade/billing flow yet (see the master
prompt, Bolum 14 -- beta users are moved between plans by hand while
there are only a handful of them). Run from the backend directory
with the venv active:

    .\\.venv\\Scripts\\python.exe scripts\\set_user_plan.py someone@example.com Pro

Usage: python scripts/set_user_plan.py <email> <Free|Pro>
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.plan_limits import PLAN_LIMITS
from app.db.session import SessionLocal
from app.models.user import User


def main() -> None:
    if len(sys.argv) != 3:
        print(
            f"Usage: python {sys.argv[0]} <email> "
            f"<{'|'.join(PLAN_LIMITS)}>"
        )
        raise SystemExit(1)

    email, plan_type = sys.argv[1], sys.argv[2]

    if plan_type not in PLAN_LIMITS:
        print(
            f"Unknown plan {plan_type!r}. Known plans: "
            f"{', '.join(PLAN_LIMITS)}"
        )
        raise SystemExit(1)

    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).one_or_none()

        if user is None:
            print(f"No user found with email {email!r}.")
            raise SystemExit(1)

        previous = user.plan_type
        user.plan_type = plan_type
        db.add(user)
        db.commit()

        print(f"{email}: {previous} -> {plan_type}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
