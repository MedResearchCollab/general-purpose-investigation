"""
Migration script to add is_archived column to studies table.
Run this script once to update existing databases.

Usage:
    cd backend
    python migrate_add_archive.py
"""
import sqlite3
import os
import sys

# Add the parent directory to the path so we can import app.config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

def migrate_database():
    """Add is_archived column to studies table if it doesn't exist"""
    # Get database path from settings
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    
    # Check if database exists
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}. It will be created automatically on first run.")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(studies)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_archived' in columns:
            print("Column 'is_archived' already exists in studies table. Migration not needed.")
        else:
            # Add the column
            cursor.execute("ALTER TABLE studies ADD COLUMN is_archived BOOLEAN DEFAULT 0")
            # Create index for better query performance
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_studies_is_archived ON studies(is_archived)")
            conn.commit()
            print("Successfully added 'is_archived' column to studies table.")
        
        conn.close()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    migrate_database()
