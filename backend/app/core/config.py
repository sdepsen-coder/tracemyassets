from pathlib import Path
import os


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def parse_origins(value: str | None) -> list[str]:
    if not value:
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    return [item.strip() for item in value.split(",") if item.strip()]


load_env_file(Path(__file__).resolve().parents[2] / ".env")


class Settings:
    def __init__(self) -> None:
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./tracemyassets.db")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.allowed_origins = parse_origins(os.getenv("ALLOWED_ORIGINS"))
        self.visual_search_provider = os.getenv(
            "VISUAL_SEARCH_PROVIDER", "fake"
        )


settings = Settings()