from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "user"
    hospital_id: Optional[int] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    hospital_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Hospital Schemas
class HospitalBase(BaseModel):
    name: str
    address: Optional[str] = None
    contact_info: Optional[str] = None


class HospitalCreate(HospitalBase):
    pass


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_info: Optional[str] = None


class HospitalResponse(HospitalBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Study Schemas
class StudyBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    is_archived: bool = False


class StudyCreate(StudyBase):
    pass


class StudyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_archived: Optional[bool] = None


class StudyResponse(StudyBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class StudyWithForms(StudyResponse):
    forms: List[Dict[str, Any]] = []


# Form Schemas
class FormField(BaseModel):
    name: str
    label: str
    type: str  # text, number, date, select, checkbox, radio, textarea
    required: bool = False
    options: Optional[List[str]] = None  # For select/radio
    placeholder: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None  # min, max, pattern, etc.


class FormSchema(BaseModel):
    fields: List[FormField]


class FormBase(BaseModel):
    name: str
    description: Optional[str] = None
    schema_json: Dict[str, Any]


class FormCreate(FormBase):
    pass


class FormUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schema_json: Optional[Dict[str, Any]] = None


class FormResponse(FormBase):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


# Submission Schemas
class SubmissionBase(BaseModel):
    form_id: int
    study_id: int
    data_json: Dict[str, Any]


class SubmissionCreate(SubmissionBase):
    pass


class SubmissionUpdate(BaseModel):
    data_json: Optional[Dict[str, Any]] = None


class SubmissionResponse(BaseModel):
    id: int
    form_id: int
    study_id: int
    user_id: int
    data_json: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str


# Export Schemas
class ExportRequest(BaseModel):
    study_id: Optional[int] = None
    form_id: Optional[int] = None
    hospital_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

