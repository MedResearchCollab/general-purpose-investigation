from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from app.config import settings

_db_url = settings.DATABASE_URL
if _db_url.startswith("sqlite"):
    os.makedirs(os.path.dirname(_db_url.replace("sqlite:///", "")), exist_ok=True)
    engine = create_engine(_db_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(_db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

