#!/usr/bin/env python3
"""
Rebuild submission_unique_keys using composed-key semantics:
- 1 unique field: unique by that field value
- 2+ unique fields: unique by the combination of all marked fields
"""
import json
import os
import sqlite3

DB_PATH = "./database/research_data.db"
if not os.path.exists(DB_PATH):
    DB_PATH = "../database/research_data.db"


def _normalize(value) -> str:
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def migrate_database():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return True

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS submission_unique_keys (
                id INTEGER PRIMARY KEY,
                submission_id INTEGER NOT NULL,
                form_id INTEGER NOT NULL,
                key_name TEXT NOT NULL,
                key_value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(submission_id) REFERENCES submissions(id),
                FOREIGN KEY(form_id) REFERENCES forms(id),
                UNIQUE(form_id, key_name, key_value)
            )
            """
        )
        cursor.execute("DELETE FROM submission_unique_keys")

        cursor.execute("SELECT id, schema_json FROM forms")
        forms = cursor.fetchall()

        inserted = 0
        skipped_duplicate = 0
        seen = set()

        for form_id, schema_json in forms:
            try:
                schema = schema_json if isinstance(schema_json, dict) else json.loads(schema_json or "{}")
            except Exception:
                schema = {}

            fields = schema.get("fields", []) if isinstance(schema, dict) else []
            unique_field_names = [
                field.get("name")
                for field in fields
                if isinstance(field, dict) and field.get("unique_key") is True and field.get("name")
            ]
            if not unique_field_names:
                continue

            cursor.execute("SELECT id, data_json FROM submissions WHERE form_id = ?", (form_id,))
            submissions = cursor.fetchall()

            for submission_id, data_json in submissions:
                try:
                    payload = data_json if isinstance(data_json, dict) else json.loads(data_json or "{}")
                    if not isinstance(payload, dict):
                        payload = {}
                except Exception:
                    payload = {}

                if len(unique_field_names) == 1:
                    key_name = unique_field_names[0]
                    value = payload.get(key_name)
                    if value is None:
                        continue
                    key_value = _normalize(value)
                    if key_value == "":
                        continue
                else:
                    parts = []
                    missing = False
                    for key_name_component in unique_field_names:
                        value = payload.get(key_name_component)
                        if value is None:
                            missing = True
                            break
                        normalized = _normalize(value)
                        if normalized == "":
                            missing = True
                            break
                        parts.append(normalized)
                    if missing:
                        continue
                    key_name = "__composite__:" + "|".join(unique_field_names)
                    key_value = json.dumps(parts, ensure_ascii=False, separators=(",", ":"))

                unique_tuple = (form_id, key_name, key_value)
                if unique_tuple in seen:
                    skipped_duplicate += 1
                    continue
                seen.add(unique_tuple)

                cursor.execute(
                    """
                    INSERT INTO submission_unique_keys (submission_id, form_id, key_name, key_value)
                    VALUES (?, ?, ?, ?)
                    """,
                    (submission_id, form_id, key_name, key_value),
                )
                inserted += 1

        conn.commit()
        print(f"Rebuild completed. Inserted rows: {inserted}")
        print(f"Skipped duplicate combinations: {skipped_duplicate}")
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
