#!/usr/bin/env python3
"""
Set one unique_key field for existing forms and backfill submission_unique_keys.

Selection strategy per form (only if no unique_key exists yet):
1) Prefer fields with non-empty values in submissions and zero duplicates.
2) If none exist, prefer first required field.
3) Fallback to first field.
"""
import json
import os
import sqlite3
from collections import defaultdict

# Default database path (adjust if needed)
DB_PATH = "./database/research_data.db"

# If DB_PATH does not exist, try relative to backend directory
if not os.path.exists(DB_PATH):
    DB_PATH = "../database/research_data.db"


KEYWORD_HINTS = (
    "id",
    "identifier",
    "code",
    "record",
    "folio",
    "document",
    "patient",
    "subject",
    "mrn",
)


def _normalize(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _load_submission_payloads(cursor, form_id: int):
    cursor.execute("SELECT id, data_json FROM submissions WHERE form_id = ?", (form_id,))
    rows = cursor.fetchall()
    result = []
    for submission_id, data_json in rows:
        try:
            payload = data_json if isinstance(data_json, dict) else json.loads(data_json or "{}")
            if not isinstance(payload, dict):
                payload = {}
        except Exception:
            payload = {}
        result.append((submission_id, payload))
    return result


def _score_field(field: dict, submissions: list):
    name = field.get("name", "")
    label = field.get("label", "")
    required = bool(field.get("required"))

    seen = set()
    duplicate_count = 0
    non_empty_count = 0

    for _, payload in submissions:
        value = _normalize(payload.get(name))
        if value == "":
            continue
        non_empty_count += 1
        if value in seen:
            duplicate_count += 1
        else:
            seen.add(value)

    hint_text = f"{name} {label}".lower()
    keyword_hint = any(k in hint_text for k in KEYWORD_HINTS)

    # Higher is better
    # Priority: zero duplicates, then more non-empty values, then keyword hint, then required.
    score = (
        1 if duplicate_count == 0 else 0,
        non_empty_count,
        1 if keyword_hint else 0,
        1 if required else 0,
    )
    return score, duplicate_count, non_empty_count


def _pick_unique_field(fields: list, submissions: list):
    if not fields:
        return None

    # If already configured, keep as-is.
    existing = [f for f in fields if f.get("unique_key") is True]
    if existing:
        return None

    best_idx = 0
    best_score = (-1, -1, -1, -1)
    best_dup = None

    for idx, field in enumerate(fields):
        score, dup_count, _ = _score_field(field, submissions)
        if score > best_score:
            best_score = score
            best_idx = idx
            best_dup = dup_count

    # If no non-empty and no perfect option, try required first, else first field.
    if best_score[1] == 0:
        for idx, field in enumerate(fields):
            if field.get("required"):
                best_idx = idx
                best_dup = 0
                break

    return best_idx, best_dup


def migrate_database():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return True

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    forms_updated = 0
    selected_fields = []
    duplicate_summary = defaultdict(int)

    try:
        cursor.execute("SELECT id, name, schema_json FROM forms")
        forms = cursor.fetchall()

        for form_id, form_name, schema_json in forms:
            try:
                schema = schema_json if isinstance(schema_json, dict) else json.loads(schema_json or "{}")
            except Exception:
                continue

            fields = schema.get("fields", []) if isinstance(schema, dict) else []
            if not isinstance(fields, list) or not fields:
                continue

            submissions = _load_submission_payloads(cursor, form_id)
            picked = _pick_unique_field(fields, submissions)
            if picked is None:
                continue

            selected_idx, dup_count = picked
            fields[selected_idx]["unique_key"] = True
            schema["fields"] = fields

            cursor.execute(
                "UPDATE forms SET schema_json = ? WHERE id = ?",
                (json.dumps(schema), form_id),
            )
            forms_updated += 1
            selected_field = fields[selected_idx].get("name", "(unknown)")
            selected_fields.append((form_id, form_name, selected_field))
            if dup_count and dup_count > 0:
                duplicate_summary[form_id] += dup_count

        # Ensure the unique keys table exists.
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

        # Rebuild indexed unique key values from current forms/submissions.
        cursor.execute("DELETE FROM submission_unique_keys")

        cursor.execute("SELECT id, schema_json FROM forms")
        forms = cursor.fetchall()
        seen = set()
        backfilled = 0
        skipped_duplicates = 0

        for form_id, schema_json in forms:
            try:
                schema = schema_json if isinstance(schema_json, dict) else json.loads(schema_json or "{}")
            except Exception:
                continue
            fields = schema.get("fields", []) if isinstance(schema, dict) else []
            unique_fields = [
                f.get("name") for f in fields if isinstance(f, dict) and f.get("unique_key") is True and f.get("name")
            ]
            if not unique_fields:
                continue

            submissions = _load_submission_payloads(cursor, form_id)
            for submission_id, payload in submissions:
                for key_name in unique_fields:
                    key_value = _normalize(payload.get(key_name))
                    if key_value == "":
                        continue
                    unique_tuple = (form_id, key_name, key_value)
                    if unique_tuple in seen:
                        skipped_duplicates += 1
                        continue
                    seen.add(unique_tuple)
                    cursor.execute(
                        """
                        INSERT INTO submission_unique_keys (submission_id, form_id, key_name, key_value)
                        VALUES (?, ?, ?, ?)
                        """,
                        (submission_id, form_id, key_name, key_value),
                    )
                    backfilled += 1

        conn.commit()

        print(f"Forms updated with a unique key: {forms_updated}")
        for form_id, form_name, key_name in selected_fields:
            print(f"- form_id={form_id} ({form_name}): unique_key={key_name}")
        print(f"submission_unique_keys backfilled rows: {backfilled}")
        print(f"submission_unique_keys skipped duplicate key rows: {skipped_duplicates}")
        if duplicate_summary:
            print("Potential duplicate values found while selecting keys:")
            for form_id, count in duplicate_summary.items():
                print(f"- form_id={form_id}: duplicate_count={count}")
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
