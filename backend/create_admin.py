#!/usr/bin/env python3
"""Script to create the first admin user (development only)."""
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import User
from app.auth import get_password_hash
from app.config import settings

# Create tables
Base.metadata.create_all(bind=engine)

# Default credentials - for local development only
DEV_ADMIN_EMAIL = "ctic_generic@example.com"
DEV_ADMIN_PASSWORD = "ctic_researcher"


def create_admin():
    if settings.is_production:
        print("ERROR: This script must not be run in production.")
        print("Create the first user via POST /api/auth/register instead.")
        return False

    print("WARNING: These credentials are for DEVELOPMENT ONLY.")
    print("In production, use /api/auth/register to create the first admin.")
    print()

    db = SessionLocal()
    try:
        # Check if any users exist
        existing_user = db.query(User).first()
        if existing_user:
            print("Users already exist. Cannot create admin user via this script.")
            print("Please use the API endpoint /api/auth/register or create users through the admin interface.")
            return False

        # Create admin user
        hashed_password = get_password_hash(DEV_ADMIN_PASSWORD)
        admin_user = User(
            email=DEV_ADMIN_EMAIL,
            password_hash=hashed_password,
            full_name="CTIC Admin User",
            role="admin",
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("=" * 60)
        print("Admin user created successfully (DEV ONLY).")
        print("=" * 60)
        print(f"Email: {DEV_ADMIN_EMAIL}")
        print(f"Password: {DEV_ADMIN_PASSWORD}")
        print(f"Full Name: CTIC Admin User")
        print(f"Role: admin")
        print("=" * 60)
        print("\nYou can now log in to the application with these credentials.")
        return True
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()

