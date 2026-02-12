#!/usr/bin/env python3
"""
Add status column to studies and map legacy flags:
- is_archived = 1 -> Canceled
- otherwise -> Data Collection
"""
import os
import sqlite3

DB_PATH = "./database/research_data.db"
if not os.path.exists(DB_PATH):
    DB_PATH = "../database/research_data.db"


def migrate_database():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return True

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(studies)")
        columns = [column[1] for column in cursor.fetchall()]

        if "status" not in columns:
            cursor.execute("ALTER TABLE studies ADD COLUMN status TEXT")
            print("Added 'status' column to studies table.")
        else:
            print("Column 'status' already exists.")

        cursor.execute(
            """
            UPDATE studies
            SET status = CASE
                WHEN COALESCE(is_archived, 0) = 1 THEN 'Canceled'
                ELSE 'Data Collection'
            END
            WHERE status IS NULL OR TRIM(status) = ''
            """
        )
        updated = cursor.rowcount
        print(f"Updated {updated} study row(s) with mapped status.")

        cursor.execute("CREATE INDEX IF NOT EXISTS ix_studies_status ON studies(status)")
        conn.commit()
        print("Migration completed successfully.")
        return True
    except Exception as exc:
        conn.rollback()
        print(f"Error during migration: {exc}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = migrate_database()
    raise SystemExit(0 if success else 1)
