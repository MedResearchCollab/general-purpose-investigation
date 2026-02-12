from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List
import json
from app.database import get_db
from app.models import Study, Form, StudyForm, User, Submission
from app.schemas import StudyCreate, StudyUpdate, StudyResponse, StudyWithForms
from app.middleware.auth_middleware import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/studies", tags=["studies"])


@router.get("", response_model=List[StudyResponse])
def list_studies(
    include_closed_canceled: bool = False,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List studies filtered by role and lifecycle status."""
    query = db.query(Study)
    show_all_statuses = include_closed_canceled or include_archived

    if current_user.role == "admin":
        # Admins can optionally include Closed/Canceled studies.
        if not show_all_statuses:
            query = query.filter(or_(Study.status.in_(["Data Collection", "Analysis"]), Study.status.is_(None)))
    else:
        # Regular users only see ongoing studies.
        query = query.filter(or_(Study.status.in_(["Data Collection", "Analysis"]), Study.status.is_(None)))

    studies = query.all()
    return studies


@router.post("", response_model=StudyResponse)
def create_study(
    study_data: StudyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new study (admin only)"""
    new_study = Study(
        name=study_data.name,
        description=study_data.description,
        title=study_data.title,
        summary=study_data.summary,
        primary_coordinating_center=study_data.primary_coordinating_center,
        principal_investigator_name=study_data.principal_investigator_name,
        principal_investigator_email=study_data.principal_investigator_email,
        sub_investigator_name=study_data.sub_investigator_name,
        sub_investigator_email=study_data.sub_investigator_email,
        general_objective=study_data.general_objective,
        specific_objectives=study_data.specific_objectives,
        inclusion_exclusion_criteria=study_data.inclusion_exclusion_criteria,
        data_collection_deadline=study_data.data_collection_deadline,
        status=study_data.status,
        is_active=study_data.status in ["Data Collection", "Analysis"],
        is_archived=study_data.status == "Canceled",
        created_by=current_user.id
    )
    
    db.add(new_study)
    db.commit()
    db.refresh(new_study)
    
    return new_study


@router.post("/{study_id}/forms/{form_id}")
def assign_form_to_study(
    study_id: int,
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Assign a form to a study (admin only)"""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )
    
    # Check if already assigned
    existing = db.query(StudyForm).filter(
        StudyForm.study_id == study_id,
        StudyForm.form_id == form_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Form already assigned to this study"
        )
    
    study_form = StudyForm(study_id=study_id, form_id=form_id)
    db.add(study_form)
    db.commit()
    
    return {"message": "Form assigned to study successfully"}


@router.delete("/{study_id}/forms/{form_id}")
def remove_form_from_study(
    study_id: int,
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Remove a form from a study (admin only)"""
    study_form = db.query(StudyForm).filter(
        StudyForm.study_id == study_id,
        StudyForm.form_id == form_id
    ).first()
    
    if not study_form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not assigned to this study"
        )
    
    db.delete(study_form)
    db.commit()
    
    return {"message": "Form removed from study successfully"}


# Backward-compatible lifecycle routes
@router.post("/{study_id}/archive", response_model=StudyResponse)
def archive_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Set study status to Canceled (legacy archive route)."""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    try:
        study.status = "Canceled"
        study.is_archived = True
        study.is_active = False
        db.commit()
        db.refresh(study)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive study: {str(e)}"
        )
    
    return study


@router.post("/{study_id}/unarchive", response_model=StudyResponse)
def unarchive_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Set study status to Data Collection (legacy unarchive route)."""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    try:
        study.status = "Data Collection"
        study.is_archived = False
        study.is_active = True
        db.commit()
        db.refresh(study)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unarchive study: {str(e)}"
        )
    
    return study


@router.get("/{study_id}", response_model=StudyWithForms)
def get_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get study with associated forms"""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    # Get associated forms
    study_forms = db.query(StudyForm).filter(StudyForm.study_id == study_id).all()
    form_ids = [sf.form_id for sf in study_forms]
    forms = db.query(Form).filter(Form.id.in_(form_ids)).all()

    # Basic profiling per form for current study
    submission_profile_rows = db.query(
        Submission.form_id.label("form_id"),
        func.count(Submission.id).label("submissions_count"),
        func.count(func.distinct(Submission.user_id)).label("contributors_count"),
        func.max(func.coalesce(Submission.updated_at, Submission.created_at)).label("last_updated_at"),
    ).filter(
        Submission.study_id == study_id,
        Submission.form_id.in_(form_ids) if form_ids else False
    ).group_by(Submission.form_id).all()
    profile_by_form_id = {row.form_id: row for row in submission_profile_rows}

    # Completion profiling using required fields in each form schema.
    submissions_by_form_id = {}
    if form_ids:
        all_submissions = db.query(Submission).filter(
            Submission.study_id == study_id,
            Submission.form_id.in_(form_ids)
        ).all()
        for submission in all_submissions:
            submissions_by_form_id.setdefault(submission.form_id, []).append(submission)

    def _is_filled(value):
        if value is None:
            return False
        if isinstance(value, str):
            return value.strip() != ""
        return True

    def _get_required_fields(schema_json):
        fields = schema_json.get("fields", []) if isinstance(schema_json, dict) else []
        return [
            field.get("name")
            for field in fields
            if isinstance(field, dict) and field.get("required") is True and field.get("name")
        ]

    def _parse_submission_payload(raw_payload):
        if isinstance(raw_payload, dict):
            return raw_payload
        if isinstance(raw_payload, str):
            try:
                parsed = json.loads(raw_payload)
                return parsed if isinstance(parsed, dict) else {}
            except Exception:
                return {}
        return {}

    def _build_dataframe_profile(form_schema_json, form_submissions):
        schema = form_schema_json if isinstance(form_schema_json, dict) else {}
        fields = schema.get("fields", []) if isinstance(schema, dict) else []
        total_submissions = len(form_submissions)

        parsed_payloads = [_parse_submission_payload(submission.data_json) for submission in form_submissions]

        field_profiles = []
        for field in fields:
            if not isinstance(field, dict):
                continue

            field_name = field.get("name")
            if not field_name:
                continue

            field_label = field.get("label") or field_name
            field_type = field.get("type") or "text"

            values = [payload.get(field_name) for payload in parsed_payloads]
            filled_values = [value for value in values if _is_filled(value)]
            filled_count = len(filled_values)
            missing_count = max(total_submissions - filled_count, 0)
            filled_pct = round((filled_count / total_submissions) * 100, 1) if total_submissions > 0 else 0.0

            field_profile = {
                "name": field_name,
                "label": field_label,
                "type": field_type,
                "filled_count": filled_count,
                "missing_count": missing_count,
                "filled_pct": filled_pct,
            }

            if field_type in ["select", "radio", "checkbox"]:
                value_counts = {}
                for value in filled_values:
                    normalized_value = str(value).strip()
                    if normalized_value == "":
                        continue
                    value_counts[normalized_value] = value_counts.get(normalized_value, 0) + 1

                sorted_counts = dict(
                    sorted(value_counts.items(), key=lambda item: (-item[1], item[0]))
                )
                field_profile["value_counts"] = sorted_counts

            field_profiles.append(field_profile)

        return {
            "total_submissions": total_submissions,
            "fields": field_profiles,
        }
    
    # Serialize forms to dictionaries
    forms_data = [
        {
            "id": form.id,
            "name": form.name,
            "description": form.description,
            "schema_json": form.schema_json,
            "created_by": form.created_by,
            "created_at": form.created_at,
            "profile": {
                "submissions_count": int(profile_by_form_id[form.id].submissions_count) if form.id in profile_by_form_id else 0,
                "contributors_count": int(profile_by_form_id[form.id].contributors_count) if form.id in profile_by_form_id else 0,
                "last_updated_at": profile_by_form_id[form.id].last_updated_at.isoformat() if form.id in profile_by_form_id and profile_by_form_id[form.id].last_updated_at else None,
                "required_fields_count": len(_get_required_fields(form.schema_json if isinstance(form.schema_json, dict) else {})),
                "complete_submissions_count": sum(
                    1
                    for submission in submissions_by_form_id.get(form.id, [])
                    if all(
                        _is_filled(_parse_submission_payload(submission.data_json).get(required_field))
                        for required_field in _get_required_fields(form.schema_json if isinstance(form.schema_json, dict) else {})
                    )
                ),
                "completion_rate_pct": (
                    round(
                        (
                            sum(
                                1
                                for submission in submissions_by_form_id.get(form.id, [])
                                if all(
                                    _is_filled(_parse_submission_payload(submission.data_json).get(required_field))
                                    for required_field in _get_required_fields(form.schema_json if isinstance(form.schema_json, dict) else {})
                                )
                            )
                            / max(len(submissions_by_form_id.get(form.id, [])), 1)
                        ) * 100,
                        1
                    ) if len(submissions_by_form_id.get(form.id, [])) > 0 else 0.0
                ),
                "dataframe_profile": _build_dataframe_profile(
                    form.schema_json,
                    submissions_by_form_id.get(form.id, []),
                ),
            }
        }
        for form in forms
    ]
    
    study_dict = {
        "id": study.id,
        "name": study.name,
        "description": study.description,
        "title": study.title,
        "summary": study.summary,
        "primary_coordinating_center": study.primary_coordinating_center,
        "principal_investigator_name": study.principal_investigator_name,
        "principal_investigator_email": study.principal_investigator_email,
        "sub_investigator_name": study.sub_investigator_name,
        "sub_investigator_email": study.sub_investigator_email,
        "general_objective": study.general_objective,
        "specific_objectives": study.specific_objectives,
        "inclusion_exclusion_criteria": study.inclusion_exclusion_criteria,
        "data_collection_deadline": study.data_collection_deadline,
        "status": study.status,
        "created_by": study.created_by,
        "created_at": study.created_at,
        "forms": forms_data
    }
    
    return study_dict


@router.put("/{study_id}", response_model=StudyResponse)
def update_study(
    study_id: int,
    study_data: StudyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update study (admin only)"""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    if study_data.name is not None:
        study.name = study_data.name
    if study_data.description is not None:
        study.description = study_data.description
    if study_data.title is not None:
        study.title = study_data.title
    if study_data.summary is not None:
        study.summary = study_data.summary
    if study_data.primary_coordinating_center is not None:
        study.primary_coordinating_center = study_data.primary_coordinating_center
    if study_data.principal_investigator_name is not None:
        study.principal_investigator_name = study_data.principal_investigator_name
    if study_data.principal_investigator_email is not None:
        study.principal_investigator_email = study_data.principal_investigator_email
    if study_data.sub_investigator_name is not None:
        study.sub_investigator_name = study_data.sub_investigator_name
    if study_data.sub_investigator_email is not None:
        study.sub_investigator_email = study_data.sub_investigator_email
    if study_data.general_objective is not None:
        study.general_objective = study_data.general_objective
    if study_data.specific_objectives is not None:
        study.specific_objectives = study_data.specific_objectives
    if study_data.inclusion_exclusion_criteria is not None:
        study.inclusion_exclusion_criteria = study_data.inclusion_exclusion_criteria
    if study_data.data_collection_deadline is not None:
        study.data_collection_deadline = study_data.data_collection_deadline
    if study_data.status is not None:
        study.status = study_data.status
        # Keep legacy flags in sync while old columns still exist.
        if study_data.status == "Canceled":
            study.is_archived = True
            study.is_active = False
        elif study_data.status in ["Data Collection", "Analysis"]:
            study.is_archived = False
            study.is_active = True
        elif study_data.status == "Closed":
            study.is_archived = False
            study.is_active = False
    
    db.commit()
    db.refresh(study)
    
    return study


@router.delete("/{study_id}")
def delete_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a study (admin only)"""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    # Check if study has submissions
    submission_count = db.query(Submission).filter(Submission.study_id == study_id).count()
    if submission_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete study with {submission_count} submission(s). Please set status to Closed or Canceled instead."
        )
    
    # Delete study (cascade will handle StudyForm relationships)
    db.delete(study)
    db.commit()
    
    return {"message": "Study deleted successfully"}

