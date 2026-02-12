#!/usr/bin/env python3
"""
Backfill submissions.updated_at when NULL using created_at.
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
        cursor.execute(
            """
            UPDATE submissions
            SET updated_at = created_at
            WHERE updated_at IS NULL
            """
        )
        updated_rows = cursor.rowcount
        conn.commit()
        print(f"Backfill completed. Rows updated: {updated_rows}")
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
