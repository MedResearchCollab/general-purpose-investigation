from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime, timezone
import json
from app.database import get_db
from app.models import Submission, Form, Study, StudyForm, User, SubmissionUniqueKey
from app.schemas import SubmissionCreate, SubmissionUpdate, SubmissionResponse
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/submissions", tags=["submissions"])


def _normalize_unique_value(value) -> str:
    """Normalize values so uniqueness checks are consistent."""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _extract_unique_key_entries(form: Form, data_json: dict) -> List[dict]:
    fields = form.schema_json.get("fields", []) if isinstance(form.schema_json, dict) else []
    unique_fields = [field for field in fields if isinstance(field, dict) and field.get("unique_key") is True]

    if len(unique_fields) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This form is invalid: no unique key field is configured. Please contact an administrator."
        )

    normalized_parts = []
    labels = []
    field_names = []

    for field in unique_fields:
        field_name = field.get("name")
        label = field.get("label") or field_name
        raw_value = data_json.get(field_name)

        if raw_value is None or _normalize_unique_value(raw_value) == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unique key field '{label}' is required and cannot be empty."
            )

        normalized_parts.append(_normalize_unique_value(raw_value))
        labels.append(label)
        field_names.append(field_name)

    # Single unique key field: keep one-field behavior.
    if len(unique_fields) == 1:
        return [{
            "key_name": field_names[0],
            "key_value": normalized_parts[0],
            "label": labels[0],
            "display_value": normalized_parts[0],
        }]

    # Multiple unique key fields: enforce uniqueness on composed key combination.
    return [{
        "key_name": f"__composite__:{'|'.join(field_names)}",
        "key_value": json.dumps(normalized_parts, ensure_ascii=False, separators=(",", ":")),
        "label": " + ".join(labels),
        "display_value": " + ".join(normalized_parts),
    }]


def _ensure_unique_values_available(
    db: Session,
    form_id: int,
    unique_entries: List[dict],
    exclude_submission_id: Optional[int] = None
):
    for entry in unique_entries:
        query = db.query(SubmissionUniqueKey).filter(
            SubmissionUniqueKey.form_id == form_id,
            SubmissionUniqueKey.key_name == entry["key_name"],
            SubmissionUniqueKey.key_value == entry["key_value"]
        )
        if exclude_submission_id is not None:
            query = query.filter(SubmissionUniqueKey.submission_id != exclude_submission_id)

        existing = query.first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate value for unique key '{entry['label']}': '{entry.get('display_value', entry['key_value'])}'."
            )


@router.get("", response_model=List[SubmissionResponse])
def list_submissions(
    study_id: Optional[int] = None,
    form_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List submissions (filtered by user/study)"""
    query = db.query(Submission)
    
    if current_user.role != "admin":
        # Users can only see their own submissions
        query = query.filter(Submission.user_id == current_user.id)
    
    if study_id:
        query = query.filter(Submission.study_id == study_id)
    if form_id:
        query = query.filter(Submission.form_id == form_id)
    
    submissions = query.all()
    
    # Parse submission data as JSON
    result = []
    for submission in submissions:
        try:
            # Parse JSON data (handle both encrypted legacy data and plain JSON)
            if isinstance(submission.data_json, str):
                data_json = json.loads(submission.data_json)
            else:
                data_json = submission.data_json if submission.data_json else {}
        except (json.JSONDecodeError, TypeError):
            # If parsing fails, try to handle legacy encrypted data gracefully
            # For now, return empty dict for corrupted data
            data_json = {}
        
        result.append({
            "id": submission.id,
            "form_id": submission.form_id,
            "study_id": submission.study_id,
            "user_id": submission.user_id,
            "data_json": data_json,
            "created_at": submission.created_at,
            "updated_at": submission.updated_at
        })
    
    return result


@router.post("", response_model=SubmissionResponse)
def create_submission(
    submission_data: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new submission"""
    # Verify form exists
    form = db.query(Form).filter(Form.id == submission_data.form_id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )
    
    # Verify study exists
    study = db.query(Study).filter(Study.id == submission_data.study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )

    study_status = study.status or ("Canceled" if study.is_archived else "Data Collection")
    if study_status != "Data Collection":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Submissions are only allowed when study status is Data Collection. Current status: {study_status}."
        )
    
    # Verify form is assigned to study
    study_form = db.query(StudyForm).filter(
        StudyForm.study_id == submission_data.study_id,
        StudyForm.form_id == submission_data.form_id
    ).first()
    
    if not study_form:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Form is not assigned to this study"
        )

    unique_entries = _extract_unique_key_entries(form, submission_data.data_json)
    _ensure_unique_values_available(
        db=db,
        form_id=submission_data.form_id,
        unique_entries=unique_entries
    )
    
    try:
        # Store submission data as JSON string
        data_json_str = json.dumps(submission_data.data_json)
        
        new_submission = Submission(
            form_id=submission_data.form_id,
            study_id=submission_data.study_id,
            user_id=current_user.id,
            data_json=data_json_str,
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(new_submission)
        db.flush()

        for entry in unique_entries:
            db.add(
                SubmissionUniqueKey(
                    submission_id=new_submission.id,
                    form_id=submission_data.form_id,
                    key_name=entry["key_name"],
                    key_value=entry["key_value"],
                )
            )

        db.commit()
        db.refresh(new_submission)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate value detected for a unique key field."
        )
    except Exception as e:
        db.rollback()
        print(f"Database error creating submission: {e}")  # Debug logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save submission: {str(e)}"
        )
    
    # Parse the stored JSON data for response
    try:
        data_json = json.loads(new_submission.data_json) if isinstance(new_submission.data_json, str) else new_submission.data_json
    except (json.JSONDecodeError, TypeError):
        data_json = {}
    
    return {
        "id": new_submission.id,
        "form_id": new_submission.form_id,
        "study_id": new_submission.study_id,
        "user_id": new_submission.user_id,
        "data_json": data_json,
        "created_at": new_submission.created_at,
        "updated_at": new_submission.updated_at
    }


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get submission details"""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # Parse JSON data
    try:
        if isinstance(submission.data_json, str):
            data_json = json.loads(submission.data_json)
        else:
            data_json = submission.data_json if submission.data_json else {}
    except (json.JSONDecodeError, TypeError):
        # Handle legacy encrypted data or corrupted data gracefully
        data_json = {}
    
    return {
        "id": submission.id,
        "form_id": submission.form_id,
        "study_id": submission.study_id,
        "user_id": submission.user_id,
        "data_json": data_json,
        "created_at": submission.created_at,
        "updated_at": submission.updated_at
    }


@router.put("/{submission_id}", response_model=SubmissionResponse)
def update_submission(
    submission_id: int,
    submission_data: SubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update submission"""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if submission_data.data_json is not None:
        form = db.query(Form).filter(Form.id == submission.form_id).first()
        if not form:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Form not found"
            )

        unique_entries = _extract_unique_key_entries(form, submission_data.data_json)
        _ensure_unique_values_available(
            db=db,
            form_id=submission.form_id,
            unique_entries=unique_entries,
            exclude_submission_id=submission.id
        )

        # Store submission data as JSON string
        submission.data_json = json.dumps(submission_data.data_json)
        submission.updated_at = datetime.now(timezone.utc)
        db.flush()
        db.query(SubmissionUniqueKey).filter(
            SubmissionUniqueKey.submission_id == submission.id
        ).delete(synchronize_session=False)

        for entry in unique_entries:
            db.add(
                SubmissionUniqueKey(
                    submission_id=submission.id,
                    form_id=submission.form_id,
                    key_name=entry["key_name"],
                    key_value=entry["key_value"],
                )
            )

    try:
        db.commit()
        db.refresh(submission)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate value detected for a unique key field."
        )
    
    # Parse the stored JSON data for response
    try:
        data_json = json.loads(submission.data_json) if isinstance(submission.data_json, str) else submission.data_json
    except (json.JSONDecodeError, TypeError):
        data_json = {}
    
    return {
        "id": submission.id,
        "form_id": submission.form_id,
        "study_id": submission.study_id,
        "user_id": submission.user_id,
        "data_json": data_json,
        "created_at": submission.created_at,
        "updated_at": submission.updated_at
    }


@router.delete("/{submission_id}")
def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete submission"""
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )
    
    # Check permissions
    if current_user.role != "admin" and submission.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    db.query(SubmissionUniqueKey).filter(
        SubmissionUniqueKey.submission_id == submission.id
    ).delete(synchronize_session=False)
    db.delete(submission)
    db.commit()
    
    return {"message": "Submission deleted successfully"}

