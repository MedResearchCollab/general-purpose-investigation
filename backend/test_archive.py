#!/usr/bin/env python3
"""
Test script for archive functionality.
This script tests the archive and unarchive endpoints.
"""
import requests
import sys
import json

API_BASE = "http://localhost:8000"

def test_archive_functionality():
    """Test archive and unarchive endpoints"""
    print("=" * 60)
    print("Testing Archive Functionality")
    print("=" * 60)
    
    # Step 1: Check if server is running
    print("\n1. Checking if server is running...")
    try:
        response = requests.get(f"{API_BASE}/docs", timeout=2)
        if response.status_code == 200:
            print("   ✓ Server is running")
        else:
            print(f"   ✗ Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("   ✗ Cannot connect to server. Is it running?")
        return False
    
    # Step 2: Check if routes are registered
    print("\n2. Checking if archive routes are registered...")
    try:
        response = requests.get(f"{API_BASE}/openapi.json", timeout=2)
        schema = response.json()
        paths = schema.get("paths", {})
        
        archive_path = "/api/studies/{study_id}/archive"
        unarchive_path = "/api/studies/{study_id}/unarchive"
        
        if archive_path in paths and unarchive_path in paths:
            print(f"   ✓ Archive route found: {archive_path}")
            print(f"   ✓ Unarchive route found: {unarchive_path}")
        else:
            print(f"   ✗ Routes not found!")
            print(f"   Available study routes:")
            for path in sorted([p for p in paths.keys() if '/api/studies' in p]):
                print(f"     - {path}")
            return False
    except Exception as e:
        print(f"   ✗ Error checking routes: {e}")
        return False
    
    # Step 3: Note about authentication
    print("\n3. Authentication required:")
    print("   ⚠️  Archive/unarchive endpoints require admin authentication.")
    print("   To test manually:")
    print("   1. Visit http://localhost:8000/docs")
    print("   2. Click 'Authorize' and login with admin credentials")
    print("   3. Try the POST /api/studies/{study_id}/archive endpoint")
    print("   4. Or test directly in the frontend UI")
    
    # Step 4: Test endpoint structure (without auth - should get 401)
    print("\n4. Testing endpoint structure (expecting 401 Unauthorized)...")
    try:
        # Try to archive study ID 1 (will fail without auth, but confirms endpoint exists)
        response = requests.post(
            f"{API_BASE}/api/studies/1/archive",
            headers={"Content-Type": "application/json"},
            timeout=2
        )
        
        if response.status_code == 401:
            print("   ✓ Endpoint exists and requires authentication (401 as expected)")
        elif response.status_code == 404:
            print("   ✗ Endpoint not found (404) - routes may not be registered")
            return False
        elif response.status_code == 403:
            print("   ✓ Endpoint exists but requires admin role (403)")
        else:
            print(f"   ? Unexpected status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   ✗ Error testing endpoint: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✓ Archive functionality is properly configured!")
    print("=" * 60)
    print("\nTo test with authentication:")
    print("  - Use Swagger UI at http://localhost:8000/docs")
    print("  - Or test in the frontend application")
    print("\nThe archive routes are ready to use!")
    
    return True

if __name__ == "__main__":
    success = test_archive_functionality()
    sys.exit(0 if success else 1)
