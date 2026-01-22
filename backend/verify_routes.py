"""
Quick script to verify that archive routes are registered.
Run this after restarting the backend server.
"""
import requests
import sys

API_BASE = "http://localhost:8000"

def verify_routes():
    """Check if archive routes are available"""
    try:
        # Try to access the API docs
        response = requests.get(f"{API_BASE}/docs")
        if response.status_code == 200:
            print("✓ Backend server is running")
        else:
            print(f"✗ Backend server returned status {response.status_code}")
            return False
        
        # Check OpenAPI schema for archive routes
        response = requests.get(f"{API_BASE}/openapi.json")
        if response.status_code == 200:
            schema = response.json()
            paths = schema.get("paths", {})
            
            archive_path = "/api/studies/{study_id}/archive"
            unarchive_path = "/api/studies/{study_id}/unarchive"
            
            if archive_path in paths:
                print(f"✓ Archive route found: {archive_path}")
            else:
                print(f"✗ Archive route NOT found: {archive_path}")
                print("  Available study routes:")
                for path in sorted(paths.keys()):
                    if "/api/studies" in path:
                        print(f"    - {path}")
                return False
            
            if unarchive_path in paths:
                print(f"✓ Unarchive route found: {unarchive_path}")
            else:
                print(f"✗ Unarchive route NOT found: {unarchive_path}")
                return False
            
            print("\n✓ All archive routes are properly registered!")
            return True
        else:
            print(f"✗ Could not fetch OpenAPI schema: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to backend server at http://localhost:8000")
        print("  Make sure the backend server is running:")
        print("  cd backend && uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    success = verify_routes()
    sys.exit(0 if success else 1)
