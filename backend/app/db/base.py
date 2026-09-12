from app.db.session import engine
from app.models.base import Base
from app.models import Asset  # noqa: F401


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)