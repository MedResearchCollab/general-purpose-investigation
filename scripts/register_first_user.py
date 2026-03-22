#!/usr/bin/env python3
"""
Register the first admin user in production (when no users exist).
Usage:
  python scripts/register_first_user.py https://your-api.example.com
  Then enter email, password, and full name when prompted.
Or with env:
  API_URL=https://your-api.example.com python scripts/register_first_user.py
"""
import os
import sys
import getpass
import urllib.request
import urllib.error
import json

def main():
    api_base = os.environ.get("API_URL") or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not api_base:
        print("Usage: API_URL=https://your-api-url python scripts/register_first_user.py")
        print("   or: python scripts/register_first_user.py https://your-api-url")
        sys.exit(1)
    api_base = api_base.rstrip("/")
    register_url = f"{api_base}/api/auth/register"

    print("Register first admin user (only works when no users exist).")
    email = input("Email: ").strip()
    if not email:
        print("Email required.")
        sys.exit(1)
    password = getpass.getpass("Password (min 8 chars): ")
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)
    full_name = input("Full name: ").strip() or "Admin"

    data = json.dumps({"email": email, "password": password, "full_name": full_name}).encode()
    req = urllib.request.Request(
        register_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            user = json.loads(body)
            print("Success! User created:", user.get("email"), "| Role:", user.get("role"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        try:
            detail = json.loads(err_body).get("detail", err_body)
        except Exception:
            detail = err_body
        print(f"Error {e.code}: {detail}")
        sys.exit(1)
    except Exception as e:
        print("Request failed:", e)
        sys.exit(1)


if __name__ == "__main__":
    main()
