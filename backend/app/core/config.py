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
        self.scan_scheduler_enabled = os.getenv(
            "SCAN_SCHEDULER_ENABLED", "true"
        ).strip().lower() not in {"false", "0", "no"}
        self.scan_scheduler_interval_minutes = int(
            os.getenv("SCAN_SCHEDULER_INTERVAL_MINUTES", "15")
        )
        # Email alerts (Resend). Alerts are silently skipped when no key
        # is configured, so local development and tests never send mail.
        self.resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
        self.email_from = os.getenv(
            "EMAIL_FROM", "TraceMyAssets <alerts@tracemyassets.com>"
        ).strip()
        self.frontend_url = os.getenv(
            "FRONTEND_URL", "http://localhost:3000"
        ).strip().rstrip("/")
        # Sign in with Google. Both must be set for the button to appear.
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        self.google_client_secret = os.getenv(
            "GOOGLE_CLIENT_SECRET", ""
        ).strip()
        # Deep scan (Google Lens through SerpApi). The limits mirror the
        # SerpApi plan and are counted by us (see provider_budget) so the
        # app stops before the plan does. Calendar day / month in UTC.
        self.serpapi_api_key = os.getenv("SERPAPI_API_KEY", "").strip()
        self.serpapi_daily_limit = int(
            os.getenv("SERPAPI_DAILY_LIMIT", "200")
        )
        self.serpapi_monthly_limit = int(
            os.getenv("SERPAPI_MONTHLY_LIMIT", "1000")
        )
        # Public address of THIS backend (e.g. the Railway URL). Deep scan
        # hands SerpApi a short-lived signed link under it so Google Lens
        # can fetch the artwork's protected copy.
        self.public_backend_url = os.getenv(
            "PUBLIC_BACKEND_URL", ""
        ).strip().rstrip("/")
        # Admin pages. ADMIN_EMAILS is a comma-separated list of the
        # addresses allowed in; anyone else gets "not found". An admin
        # must have signed in with Google within the last
        # ADMIN_SESSION_MINUTES (set ADMIN_REQUIRE_GOOGLE=false only for
        # local development).
        self.admin_emails = {
            item.strip().lower()
            for item in os.getenv("ADMIN_EMAILS", "").split(",")
            if item.strip()
        }
        self.admin_session_minutes = int(
            os.getenv("ADMIN_SESSION_MINUTES", "120")
        )
        self.admin_require_google = os.getenv(
            "ADMIN_REQUIRE_GOOGLE", "true"
        ).strip().lower() not in {"false", "0", "no"}
        # Activity log (IP addresses, browser strings): how long it is
        # kept, and how many reverse proxies sit in front of the backend
        # (Railway's edge, then the frontend's rewrite), so the visitor's
        # address can be read from the right end of X-Forwarded-For.
        self.event_retention_days = int(
            os.getenv("EVENT_RETENTION_DAYS", "90")
        )
        self.trusted_proxy_hops = int(
            os.getenv("TRUSTED_PROXY_HOPS", "2")
        )
        # Sign-up and sign-in protection. All of it can be loosened here
        # without a code change. 0 switches a limit off.
        self.block_disposable_emails = os.getenv(
            "BLOCK_DISPOSABLE_EMAILS", "true"
        ).strip().lower() not in {"false", "0", "no"}
        self.blocked_email_domains = {
            item.strip().lower()
            for item in os.getenv("BLOCKED_EMAIL_DOMAINS", "").split(",")
            if item.strip()
        }
        self.max_signups_per_ip_per_day = int(
            os.getenv("MAX_SIGNUPS_PER_IP_PER_DAY", "5")
        )
        self.max_failed_logins_per_email = int(
            os.getenv("MAX_FAILED_LOGINS_PER_EMAIL", "10")
        )
        self.max_failed_logins_per_ip = int(
            os.getenv("MAX_FAILED_LOGINS_PER_IP", "30")
        )
        # When true, the free welcome credits wait for a confirmed email
        # address. Switch on only once the sending domain is verified at
        # Resend, otherwise the confirmation emails never arrive.
        self.email_verification_required = os.getenv(
            "EMAIL_VERIFICATION_REQUIRED", "false"
        ).strip().lower() in {"true", "1", "yes"}


settings = Settings()