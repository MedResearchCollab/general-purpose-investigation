#!/usr/bin/env python3
"""Generate SECRET_KEY and ENCRYPTION_KEY for production .env"""
import secrets
from cryptography.fernet import Fernet

secret_key = secrets.token_urlsafe(32)
encryption_key = Fernet.generate_key().decode()

print("# Add these to your backend .env (production). Do not commit.")
print()
print(f"SECRET_KEY={secret_key}")
print(f"ENCRYPTION_KEY={encryption_key}")
print()
print("# Then set ENVIRONMENT=production and your CORS_ORIGINS (e.g. https://your-app.example.com)")
