from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models import User
from app.schemas import (
    BootstrapPasswordResetRequest,
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    Token,
    UserResponse,
)
from app.auth import verify_password, get_password_hash, create_access_token
from app.config import settings
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user; return JWT and set httpOnly cookie for browser clients."""
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=access_token_expires,
    )
    max_age = int(access_token_expires.total_seconds())
    response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=access_token,
        path="/",
        max_age=max_age,
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE.lower(),
        secure=settings.AUTH_COOKIE_SECURE or settings.is_production,
    )
    return response


@router.post("/register", response_model=UserResponse)
def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register first admin user (only if no users exist)"""
    # Check if any users exist
    existing_user = db.query(User).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is only allowed for the first user"
        )
    
    # Check if email already exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create admin user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        role="admin"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return current_user


@router.post("/logout")
def logout():
    """Clear auth cookie (for browser clients using httpOnly cookie)."""
    response = JSONResponse(content={"detail": "Logged out"})
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite=settings.AUTH_COOKIE_SAMESITE.lower(),
        secure=settings.AUTH_COOKIE_SECURE or settings.is_production,
    )
    return response


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow authenticated users to rotate their own password."""
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


@router.post("/bootstrap-reset-password")
def bootstrap_reset_password(
    payload: BootstrapPasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Emergency recovery endpoint.
    Works only when BOOTSTRAP_RESET_SECRET is configured and matches payload.
    """
    configured_secret = settings.BOOTSTRAP_RESET_SECRET.strip()
    if not configured_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password recovery is disabled",
        )

    if payload.reset_secret != configured_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid reset secret",
        )

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = get_password_hash(payload.new_password)
    user.is_active = True
    db.commit()

    return {"message": "Password reset successfully. Log in and rotate credentials immediately."}

