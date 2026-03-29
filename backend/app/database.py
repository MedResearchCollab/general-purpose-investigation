from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from app.config import settings

_db_url = settings.DATABASE_URL.strip()
# Railway / Heroku-style URLs often use postgres://; SQLAlchemy expects postgresql://
if _db_url.startswith("postgres://"):
    _db_url = "postgresql://" + _db_url[len("postgres://") :]

if _db_url.startswith("sqlite"):
    os.makedirs(os.path.dirname(_db_url.replace("sqlite:///", "")), exist_ok=True)
    engine = create_engine(_db_url, connect_args={"check_same_thread": False})
else:
    if "://" not in _db_url:
        raise RuntimeError(
            "DATABASE_URL must be a full URL (e.g. postgresql://user:pass@host:5432/dbname). "
            "On Railway: Backend → Variables → Add reference → your Postgres service → DATABASE_URL "
            "from the Postgres Variables tab. Do not use only the public TCP proxy host:port from "
            "Postgres → Networking."
        )
    if not _db_url.startswith("postgresql://"):
        raise RuntimeError("DATABASE_URL for PostgreSQL must start with postgresql:// or postgres://")

    sslmode = (settings.DATABASE_SSLMODE or "").strip()
    connect_args = {"sslmode": sslmode} if sslmode else {}
    engine = create_engine(_db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

