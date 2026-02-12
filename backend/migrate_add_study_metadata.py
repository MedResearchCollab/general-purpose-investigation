#!/usr/bin/env python3
"""
Simple migration script to add study metadata fields to studies table.
This version does not require app imports.
"""
import os
import sqlite3

# Default database path (adjust if needed)
DB_PATH = "./database/research_data.db"

# If DB_PATH does not exist, try relative to backend directory
if not os.path.exists(DB_PATH):
    DB_PATH = "../database/research_data.db"


def migrate_database():
    """Add metadata columns to studies table if they do not exist"""
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("Columns will be created automatically on fresh databases.")
        return True

    columns_to_add = [
        ("title", "TEXT"),
        ("summary", "TEXT"),
        ("primary_coordinating_center", "TEXT"),
        ("principal_investigator_name", "TEXT"),
        ("principal_investigator_email", "TEXT"),
        ("sub_investigator_name", "TEXT"),
        ("sub_investigator_email", "TEXT"),
        ("general_objective", "TEXT"),
        ("specific_objectives", "TEXT"),
        ("inclusion_exclusion_criteria", "TEXT"),
        ("data_collection_deadline", "DATE"),
    ]

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("PRAGMA table_info(studies)")
        existing_columns = {column[1] for column in cursor.fetchall()}

        added_any = False
        for column_name, column_type in columns_to_add:
            if column_name in existing_columns:
                print(f"- Column '{column_name}' already exists.")
                continue
            print(f"Adding '{column_name}' column...")
            cursor.execute(f"ALTER TABLE studies ADD COLUMN {column_name} {column_type}")
            added_any = True

        if added_any:
            conn.commit()
            print("Migration completed: study metadata columns added.")
        else:
            print("No changes needed: all metadata columns already exist.")

        conn.close()
        return True
    except Exception as exc:
        print(f"Error during migration: {exc}")
        return False


if __name__ == "__main__":
    success = migrate_database()
    raise SystemExit(0 if success else 1)
