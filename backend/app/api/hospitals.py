from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Hospital, User
from app.schemas import HospitalCreate, HospitalUpdate, HospitalResponse
from app.middleware.auth_middleware import get_current_admin_user, get_current_user

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


@router.get("", response_model=List[HospitalResponse])
def list_hospitals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all hospitals"""
    hospitals = db.query(Hospital).all()
    return hospitals


@router.post("", response_model=HospitalResponse)
def create_hospital(
    hospital_data: HospitalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new hospital (admin only)"""
    new_hospital = Hospital(
        name=hospital_data.name,
        address=hospital_data.address,
        contact_info=hospital_data.contact_info
    )
    
    db.add(new_hospital)
    db.commit()
    db.refresh(new_hospital)
    
    return new_hospital


@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get hospital details"""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found"
        )
    
    return hospital


@router.put("/{hospital_id}", response_model=HospitalResponse)
def update_hospital(
    hospital_id: int,
    hospital_data: HospitalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update hospital (admin only)"""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found"
        )
    
    if hospital_data.name is not None:
        hospital.name = hospital_data.name
    if hospital_data.address is not None:
        hospital.address = hospital_data.address
    if hospital_data.contact_info is not None:
        hospital.contact_info = hospital_data.contact_info
    
    db.commit()
    db.refresh(hospital)
    
    return hospital


@router.delete("/{hospital_id}")
def delete_hospital(
    hospital_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete hospital (admin only)"""
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found"
        )
    
    # Check if hospital has users
    if hospital.users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete hospital with assigned users"
        )
    
    db.delete(hospital)
    db.commit()
    
    return {"message": "Hospital deleted successfully"}

