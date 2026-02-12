from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import csv
import json
import io
from app.database import get_db
from app.models import Submission, User
from app.schemas import ExportRequest
from app.middleware.auth_middleware import get_current_admin_user

router = APIRouter(prefix="/api/export", tags=["export"])


def _format_filters_for_message(export_request: ExportRequest) -> str:
    parts = []
    if export_request.study_id is not None:
        parts.append(f"study_id={export_request.study_id}")
    if export_request.form_id is not None:
        parts.append(f"form_id={export_request.form_id}")
    if export_request.hospital_id is not None:
        parts.append(f"hospital_id={export_request.hospital_id}")
    if export_request.start_date is not None:
        parts.append(f"start_date={export_request.start_date.isoformat()}")
    if export_request.end_date is not None:
        parts.append(f"end_date={export_request.end_date.isoformat()}")
    return ", ".join(parts) if parts else "no filters"


def _validate_export_dates(export_request: ExportRequest):
    if (
        export_request.start_date is not None
        and export_request.end_date is not None
        and export_request.start_date > export_request.end_date
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date range: start_date must be before or equal to end_date."
        )


@router.post("/csv")
def export_csv(
    export_request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Export data as CSV (admin only)"""
    _validate_export_dates(export_request)
    query = db.query(Submission)
    
    if export_request.study_id:
        query = query.filter(Submission.study_id == export_request.study_id)
    if export_request.form_id:
        query = query.filter(Submission.form_id == export_request.form_id)
    if export_request.hospital_id:
        query = query.join(User).filter(User.hospital_id == export_request.hospital_id)
    if export_request.start_date:
        query = query.filter(Submission.created_at >= export_request.start_date)
    if export_request.end_date:
        query = query.filter(Submission.created_at <= export_request.end_date)
    
    submissions = query.all()
    
    if not submissions:
        applied_filters = _format_filters_for_message(export_request)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No submissions found for export using filters: {applied_filters}."
        )
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Submission ID",
        "Form ID",
        "Study ID",
        "User ID",
        "User Email",
        "Hospital ID",
        "Created At",
        "Updated At",
        "Data (JSON)"
    ])
    
    # Write data
    for submission in submissions:
        try:
            # Parse JSON data
            if isinstance(submission.data_json, str):
                data_json = json.loads(submission.data_json)
            else:
                data_json = submission.data_json if submission.data_json else {}
            
            user = db.query(User).filter(User.id == submission.user_id).first()
            writer.writerow([
                submission.id,
                submission.form_id,
                submission.study_id,
                submission.user_id,
                user.email if user else "",
                user.hospital_id if user else "",
                submission.created_at.isoformat() if submission.created_at else "",
                submission.updated_at.isoformat() if submission.updated_at else "",
                json.dumps(data_json)
            ])
        except Exception as e:
            # Skip corrupted submissions
            continue
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.post("/json")
def export_json(
    export_request: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Export data as JSON (admin only)"""
    _validate_export_dates(export_request)
    query = db.query(Submission)
    
    if export_request.study_id:
        query = query.filter(Submission.study_id == export_request.study_id)
    if export_request.form_id:
        query = query.filter(Submission.form_id == export_request.form_id)
    if export_request.hospital_id:
        query = query.join(User).filter(User.hospital_id == export_request.hospital_id)
    if export_request.start_date:
        query = query.filter(Submission.created_at >= export_request.start_date)
    if export_request.end_date:
        query = query.filter(Submission.created_at <= export_request.end_date)
    
    submissions = query.all()
    
    if not submissions:
        applied_filters = _format_filters_for_message(export_request)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No submissions found for export using filters: {applied_filters}."
        )
    
    # Build export data
    export_data = {
        "export_date": datetime.now().isoformat(),
        "filters": {
            "study_id": export_request.study_id,
            "form_id": export_request.form_id,
            "hospital_id": export_request.hospital_id,
            "start_date": export_request.start_date.isoformat() if export_request.start_date is not None else None,
            "end_date": export_request.end_date.isoformat() if export_request.end_date is not None else None
        },
        "submissions": []
    }
    
    for submission in submissions:
        try:
            # Parse JSON data
            if isinstance(submission.data_json, str):
                data_json = json.loads(submission.data_json)
            else:
                data_json = submission.data_json if submission.data_json else {}
            
            user = db.query(User).filter(User.id == submission.user_id).first()
            export_data["submissions"].append({
                "id": submission.id,
                "form_id": submission.form_id,
                "study_id": submission.study_id,
                "user": {
                    "id": submission.user_id,
                    "email": user.email if user else None,
                    "full_name": user.full_name if user else None,
                    "hospital_id": user.hospital_id if user else None
                },
                "data": data_json,
                "created_at": submission.created_at.isoformat() if submission.created_at else None,
                "updated_at": submission.updated_at.isoformat() if submission.updated_at else None
            })
        except Exception as e:
            # Skip corrupted submissions
            continue
    
    return StreamingResponse(
        iter([json.dumps(export_data, indent=2)]),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )

