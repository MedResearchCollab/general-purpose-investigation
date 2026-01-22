#!/usr/bin/env python3
"""
Simple migration script to add is_archived column to studies table.
This version doesn't require app imports.
"""
import sqlite3
import os

# Default database path (adjust if needed)
DB_PATH = "./database/research_data.db"

# If DB_PATH doesn't exist, try relative to backend directory
if not os.path.exists(DB_PATH):
    DB_PATH = "../database/research_data.db"

def migrate_database():
    """Add is_archived column to studies table if it doesn't exist"""
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("The column will be created automatically when the server starts with the new model.")
        return
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(studies)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_archived' in columns:
            print("✓ Column 'is_archived' already exists in studies table.")
            print("  Migration not needed.")
        else:
            print(f"Adding 'is_archived' column to studies table in {DB_PATH}...")
            # Add the column
            cursor.execute("ALTER TABLE studies ADD COLUMN is_archived BOOLEAN DEFAULT 0")
            # Create index for better query performance
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_studies_is_archived ON studies(is_archived)")
            conn.commit()
            print("✓ Successfully added 'is_archived' column to studies table.")
            print("✓ Created index on is_archived column.")
        
        conn.close()
        print("\n✓ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = migrate_database()
    exit(0 if success else 1)
