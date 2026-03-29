from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import urlparse


# Default secrets - only for development; production must set via env
DEV_SECRET_KEY = "your-secret-key-change-this-in-production"
DEV_ENCRYPTION_KEY = "your-32-byte-encryption-key-base64-encoded"


class Settings(BaseSettings):
    # Environment: "development" | "production"
    ENVIRONMENT: str = "development"

    # JWT Configuration (set SECRET_KEY in production)
    SECRET_KEY: str = DEV_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Encryption (set ENCRYPTION_KEY in production; use Fernet.generate_key() and base64)
    ENCRYPTION_KEY: str = DEV_ENCRYPTION_KEY

    # Database (SQLite for local dev; set DATABASE_URL to postgresql://... on Railway Postgres)
    DATABASE_URL: str = "sqlite:///./database/research_data.db"
    # Optional libpq sslmode for PostgreSQL (e.g. require) if your host needs explicit TLS
    DATABASE_SSLMODE: str = ""

    # CORS (restrict to your frontend origin(s) in production)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Auth cookie (httpOnly) – used when frontend sends credentials
    AUTH_COOKIE_NAME: str = "access_token"
    AUTH_COOKIE_SAMESITE: str = "lax"  # lax | strict | none
    AUTH_COOKIE_SECURE: bool = False   # set True in production (HTTPS)

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @property
    def _cors_allows_remote_origin(self) -> bool:
        """True if any allowed CORS origin is not localhost (split frontend/API, e.g. Railway)."""
        for origin in self.cors_origins_list:
            parsed = urlparse(origin)
            host = (parsed.hostname or "").lower()
            if host not in ("", "localhost", "127.0.0.1"):
                return True
        return False

    @property
    def auth_cookie_samesite_value(self) -> str:
        """
        SameSite=Lax blocks sending httpOnly cookies on cross-site XHR (SPA on host A, API on host B).
        When CORS allows a non-local origin, use SameSite=None + Secure so browsers attach the cookie.
        """
        raw = (self.AUTH_COOKIE_SAMESITE or "lax").strip().lower()
        if raw not in ("lax", "strict", "none"):
            raw = "lax"
        if raw == "none":
            return "none"
        if self._cors_allows_remote_origin:
            return "none"
        return raw

    @property
    def auth_cookie_secure_value(self) -> bool:
        """SameSite=None requires Secure in modern browsers."""
        if self.auth_cookie_samesite_value == "none":
            return True
        return self.AUTH_COOKIE_SECURE or self.is_production

    def validate_production_secrets(self) -> None:
        """Raise if in production but default secrets are still in use."""
        if not self.is_production:
            return
        if self.SECRET_KEY == DEV_SECRET_KEY or self.ENCRYPTION_KEY == DEV_ENCRYPTION_KEY:
            raise RuntimeError(
                "Production mode requires SECRET_KEY and ENCRYPTION_KEY to be set in environment. "
                "Do not use default development values."
            )

    @property
    def cors_origins_list(self) -> List[str]:
        configured = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        expanded = set(configured)

        # Keep localhost and 127.0.0.1 in sync to avoid common local CORS mismatches.
        for origin in configured:
            parsed = urlparse(origin)
            if not parsed.scheme or not parsed.hostname:
                continue

            if parsed.hostname == "localhost":
                alt_host = "127.0.0.1"
            elif parsed.hostname == "127.0.0.1":
                alt_host = "localhost"
            else:
                continue

            port = f":{parsed.port}" if parsed.port else ""
            expanded.add(f"{parsed.scheme}://{alt_host}{port}")

        return sorted(expanded)


settings = Settings()

