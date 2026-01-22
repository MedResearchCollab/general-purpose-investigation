from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Study, Form, StudyForm, User, Submission
from app.schemas import StudyCreate, StudyUpdate, StudyResponse, StudyWithForms
from app.middleware.auth_middleware import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/studies", tags=["studies"])


@router.get("", response_model=List[StudyResponse])
def list_studies(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List studies (filtered by user role and archive status)"""
    query = db.query(Study)
    
    if current_user.role == "admin":
        # Admins can see all studies, optionally filtered by archive status
        if not include_archived:
            query = query.filter(Study.is_archived == False)
    else:
        # Regular users see all active, non-archived studies
        query = query.filter(Study.is_active == True, Study.is_archived == False)
    
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
        is_active=study_data.is_active,
        is_archived=study_data.is_archived,
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


# Archive/unarchive routes - must come before generic /{study_id} routes
@router.post("/{study_id}/archive", response_model=StudyResponse)
def archive_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Archive a study (admin only)"""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    try:
        study.is_archived = True
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
    """Unarchive a study (admin only)"""
    study = db.query(Study).filter(Study.id == study_id).first()
    if not study:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study not found"
        )
    
    try:
        study.is_archived = False
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
    
    # Serialize forms to dictionaries
    forms_data = [
        {
            "id": form.id,
            "name": form.name,
            "description": form.description,
            "schema_json": form.schema_json,
            "created_by": form.created_by,
            "created_at": form.created_at
        }
        for form in forms
    ]
    
    study_dict = {
        "id": study.id,
        "name": study.name,
        "description": study.description,
        "is_active": study.is_active,
        "is_archived": study.is_archived,
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
    if study_data.is_active is not None:
        study.is_active = study_data.is_active
    if study_data.is_archived is not None:
        study.is_archived = study_data.is_archived
    
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
            detail=f"Cannot delete study with {submission_count} submission(s). Please archive it instead."
        )
    
    # Delete study (cascade will handle StudyForm relationships)
    db.delete(study)
    db.commit()
    
    return {"message": "Study deleted successfully"}

