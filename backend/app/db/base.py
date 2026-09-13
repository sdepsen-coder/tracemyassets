from app.db.session import engine
from app.models.base import Base


def initialize_database() -> None:
    from app.models import asset, match, takedown, user  # noqa: F401

    Base.metadata.create_all(bind=engine)