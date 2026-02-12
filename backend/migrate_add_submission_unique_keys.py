#!/usr/bin/env python3
"""
Create and backfill submission_unique_keys table.
"""
import json
import os
import sqlite3

# Default database path (adjust if needed)
DB_PATH = "./database/research_data.db"

# If DB_PATH does not exist, try relative to backend directory
if not os.path.exists(DB_PATH):
    DB_PATH = "../database/research_data.db"


def _normalize_unique_value(value) -> str:
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def migrate_database():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        print("No migration needed.")
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
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_submission_unique_keys_submission_id ON submission_unique_keys(submission_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_submission_unique_keys_form_id ON submission_unique_keys(form_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_submission_unique_keys_key_name ON submission_unique_keys(key_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_submission_unique_keys_key_value ON submission_unique_keys(key_value)")

        # Skip backfill if already populated.
        cursor.execute("SELECT COUNT(*) FROM submission_unique_keys")
        if cursor.fetchone()[0] > 0:
            conn.commit()
            print("submission_unique_keys already populated. Migration completed.")
            return True

        cursor.execute("SELECT id, schema_json FROM forms")
        forms = cursor.fetchall()

        duplicates = []
        rows_to_insert = []
        seen = {}

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
                except Exception:
                    payload = {}

                # Single unique field => one-field key.
                if len(unique_field_names) == 1:
                    key_name = unique_field_names[0]
                    value = payload.get(key_name)
                    if value is None:
                        continue
                    normalized = _normalize_unique_value(value)
                    if normalized == "":
                        continue

                    unique_tuple = (form_id, key_name, normalized)
                    if unique_tuple in seen and seen[unique_tuple] != submission_id:
                        duplicates.append(
                            {
                                "form_id": form_id,
                                "key_name": key_name,
                                "key_value": normalized,
                                "submission_a": seen[unique_tuple],
                                "submission_b": submission_id,
                            }
                        )
                    else:
                        seen[unique_tuple] = submission_id
                        rows_to_insert.append((submission_id, form_id, key_name, normalized))
                    continue

                # Multiple unique fields => composed key on the full combination.
                values = []
                missing_component = False
                for key_name in unique_field_names:
                    value = payload.get(key_name)
                    if value is None:
                        missing_component = True
                        break
                    normalized = _normalize_unique_value(value)
                    if normalized == "":
                        missing_component = True
                        break
                    values.append(normalized)

                if missing_component:
                    continue

                composed_key_name = "__composite__:" + "|".join(unique_field_names)
                composed_key_value = json.dumps(values, ensure_ascii=False, separators=(",", ":"))
                unique_tuple = (form_id, composed_key_name, composed_key_value)
                if unique_tuple in seen and seen[unique_tuple] != submission_id:
                    duplicates.append(
                        {
                            "form_id": form_id,
                            "key_name": composed_key_name,
                            "key_value": composed_key_value,
                            "submission_a": seen[unique_tuple],
                            "submission_b": submission_id,
                        }
                    )
                else:
                    seen[unique_tuple] = submission_id
                    rows_to_insert.append((submission_id, form_id, composed_key_name, composed_key_value))

        if duplicates:
            print("Migration aborted: duplicate unique key values found in existing submissions.")
            for dup in duplicates[:20]:
                print(
                    f"- form_id={dup['form_id']} key={dup['key_name']} value='{dup['key_value']}' "
                    f"submissions={dup['submission_a']},{dup['submission_b']}"
                )
            print("Resolve duplicates first, then rerun migration.")
            conn.rollback()
            return False

        for row in rows_to_insert:
            cursor.execute(
                """
                INSERT INTO submission_unique_keys (submission_id, form_id, key_name, key_value)
                VALUES (?, ?, ?, ?)
                """,
                row,
            )

        conn.commit()
        print(f"Migration completed: created table and backfilled {len(rows_to_insert)} unique key rows.")
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
