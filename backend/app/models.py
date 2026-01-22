from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="user")  # "admin" or "user"
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    hospital = relationship("Hospital", back_populates="users")
    created_studies = relationship("Study", back_populates="creator")
    created_forms = relationship("Form", back_populates="creator")
    submissions = relationship("Submission", back_populates="user")


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    address = Column(Text, nullable=True)
    contact_info = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="hospital")


class Study(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="created_studies")
    forms = relationship("StudyForm", back_populates="study", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="study")


class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    schema_json = Column(JSON, nullable=False)  # Form field definitions
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creator = relationship("User", back_populates="created_forms")
    studies = relationship("StudyForm", back_populates="form", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="form")


class StudyForm(Base):
    __tablename__ = "study_forms"

    study_id = Column(Integer, ForeignKey("studies.id"), primary_key=True)
    form_id = Column(Integer, ForeignKey("forms.id"), primary_key=True)

    study = relationship("Study", back_populates="forms")
    form = relationship("Form", back_populates="studies")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    study_id = Column(Integer, ForeignKey("studies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    data_json = Column(Text, nullable=False)  # JSON form data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    form = relationship("Form", back_populates="submissions")
    study = relationship("Study", back_populates="submissions")
    user = relationship("User", back_populates="submissions")

