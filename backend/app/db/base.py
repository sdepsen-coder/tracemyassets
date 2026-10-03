from app.db.session import engine
from app.models.base import Base


def initialize_database() -> None:
    from app.models import (  # noqa: F401
        asset,
        feedback,
        match,
        match_record,
        monitoring,
        scan_job,
        takedown,
        user,
    )

    Base.metadata.create_all(bind=engine)