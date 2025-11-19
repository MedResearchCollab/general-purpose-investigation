from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Form, StudyForm, User
from app.schemas import FormCreate, FormUpdate, FormResponse
from app.middleware.auth_middleware import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/forms", tags=["forms"])


@router.get("", response_model=List[FormResponse])
def list_forms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List forms (admin sees all, users see forms from their studies)"""
    if current_user.role == "admin":
        forms = db.query(Form).all()
    else:
        # Get forms from studies (users can see forms from active studies)
        study_forms = db.query(StudyForm).join(Form).all()
        form_ids = [sf.form_id for sf in study_forms]
        forms = db.query(Form).filter(Form.id.in_(form_ids)).all() if form_ids else []
    
    return forms


@router.post("", response_model=FormResponse)
def create_form(
    form_data: FormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new form (admin only)"""
    new_form = Form(
        name=form_data.name,
        description=form_data.description,
        schema_json=form_data.schema_json,
        created_by=current_user.id
    )
    
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    
    return new_form


@router.get("/{form_id}", response_model=FormResponse)
def get_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get form schema"""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )
    
    # Check if user has access (admin or form is in a study)
    if current_user.role != "admin":
        study_form = db.query(StudyForm).filter(StudyForm.form_id == form_id).first()
        if not study_form:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    return form


@router.put("/{form_id}", response_model=FormResponse)
def update_form(
    form_id: int,
    form_data: FormUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update form (admin only)"""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )
    
    if form_data.name is not None:
        form.name = form_data.name
    if form_data.description is not None:
        form.description = form_data.description
    if form_data.schema_json is not None:
        form.schema_json = form_data.schema_json
    
    db.commit()
    db.refresh(form)
    
    return form


@router.delete("/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete form (admin only)"""
    form = db.query(Form).filter(Form.id == form_id).first()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found"
        )
    
    # Check if form has submissions
    if form.submissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete form with existing submissions"
        )
    
    db.delete(form)
    db.commit()
    
    return {"message": "Form deleted successfully"}

