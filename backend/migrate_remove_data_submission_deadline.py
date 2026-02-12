#!/usr/bin/env python3
"""
Migration script to remove the legacy data_submission_deadline column
from the studies table in SQLite.
"""
import os
import sqlite3

# Default database path (adjust if needed)
DB_PATH = "./database/research_data.db"

# If DB_PATH does not exist, try relative to backend directory
if not os.path.exists(DB_PATH):
    DB_PATH = "../database/research_data.db"


def migrate_database():
    """Remove data_submission_deadline column from studies table."""
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("No migration needed.")
        return True

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(studies)")
        columns = [column[1] for column in cursor.fetchall()]

        if "data_submission_deadline" not in columns:
            print("Column 'data_submission_deadline' does not exist. No changes needed.")
            return True

        print("Removing 'data_submission_deadline' from studies table...")
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("BEGIN TRANSACTION")

        cursor.execute("ALTER TABLE studies RENAME TO studies_old")

        cursor.execute(
            """
            CREATE TABLE studies (
                id INTEGER PRIMARY KEY,
                name VARCHAR NOT NULL,
                description TEXT,
                title VARCHAR,
                summary TEXT,
                primary_coordinating_center VARCHAR,
                principal_investigator_name VARCHAR,
                principal_investigator_email VARCHAR,
                sub_investigator_name VARCHAR,
                sub_investigator_email VARCHAR,
                general_objective TEXT,
                specific_objectives TEXT,
                inclusion_exclusion_criteria TEXT,
                data_collection_deadline DATE,
                created_by INTEGER NOT NULL,
                is_active BOOLEAN,
                is_archived BOOLEAN,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(created_by) REFERENCES users (id)
            )
            """
        )

        cursor.execute(
            """
            INSERT INTO studies (
                id,
                name,
                description,
                title,
                summary,
                primary_coordinating_center,
                principal_investigator_name,
                principal_investigator_email,
                sub_investigator_name,
                sub_investigator_email,
                general_objective,
                specific_objectives,
                inclusion_exclusion_criteria,
                data_collection_deadline,
                created_by,
                is_active,
                is_archived,
                created_at
            )
            SELECT
                id,
                name,
                description,
                title,
                summary,
                primary_coordinating_center,
                principal_investigator_name,
                principal_investigator_email,
                sub_investigator_name,
                sub_investigator_email,
                general_objective,
                specific_objectives,
                inclusion_exclusion_criteria,
                data_collection_deadline,
                created_by,
                is_active,
                is_archived,
                created_at
            FROM studies_old
            """
        )

        cursor.execute("DROP TABLE studies_old")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_studies_name ON studies(name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_studies_is_archived ON studies(is_archived)")

        conn.commit()
        cursor.execute("PRAGMA foreign_keys=ON")
        print("Migration completed: removed 'data_submission_deadline'.")
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
