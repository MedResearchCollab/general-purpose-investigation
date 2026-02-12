from pydantic_settings import BaseSettings
from typing import List
from urllib.parse import urlparse


class Settings(BaseSettings):
    # JWT Configuration
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Encryption
    ENCRYPTION_KEY: str = "your-32-byte-encryption-key-base64-encoded"

    # Database
    DATABASE_URL: str = "sqlite:///./database/research_data.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True

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

