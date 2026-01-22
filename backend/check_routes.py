#!/usr/bin/env python3
"""
Quick script to check if archive routes are registered in the API.
Run this after restarting the server to verify the routes are available.
"""
import requests
import sys

API_BASE = "http://localhost:8000"

def check_routes():
    """Check if archive routes are available"""
    try:
        # Check if server is running
        response = requests.get(f"{API_BASE}/docs", timeout=2)
        if response.status_code != 200:
            print(f"✗ Server returned status {response.status_code}")
            return False
        print("✓ Server is running")
        
        # Check OpenAPI schema for archive routes
        response = requests.get(f"{API_BASE}/openapi.json", timeout=2)
        if response.status_code != 200:
            print(f"✗ Could not fetch OpenAPI schema: {response.status_code}")
            return False
        
        schema = response.json()
        paths = schema.get("paths", {})
        
        archive_path = "/api/studies/{study_id}/archive"
        unarchive_path = "/api/studies/{study_id}/unarchive"
        
        found_archive = archive_path in paths
        found_unarchive = unarchive_path in paths
        
        print(f"\n{'✓' if found_archive else '✗'} Archive route: {archive_path}")
        if found_archive:
            methods = list(paths[archive_path].keys())
            print(f"  Methods: {', '.join(methods)}")
        
        print(f"\n{'✓' if found_unarchive else '✗'} Unarchive route: {unarchive_path}")
        if found_unarchive:
            methods = list(paths[unarchive_path].keys())
            print(f"  Methods: {', '.join(methods)}")
        
        if not found_archive or not found_unarchive:
            print("\n⚠️  Routes not found. Please restart the server:")
            print("  1. Stop the current server (Ctrl+C)")
            print("  2. Run: cd backend && source venv/bin/activate && uvicorn app.main:app --reload")
            print("\nOr use the restart script: ./restart_server.sh")
            return False
        
        print("\n✓ All archive routes are properly registered!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to backend server at http://localhost:8000")
        print("  Make sure the backend server is running")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = check_routes()
    sys.exit(0 if success else 1)
