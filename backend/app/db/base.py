from app.db.session import engine
from app.models.base import Base


def initialize_database() -> None:
    from app.models import (  # noqa: F401
        asset,
        credit_entry,
        feedback,
        match,
        match_record,
        monitoring,
        password_reset,
        provider_usage,
        scan_job,
        session_cutoff,
        takedown,
        user,
        user_event,
        user_suspension,
    )

    Base.metadata.create_all(bind=engine)