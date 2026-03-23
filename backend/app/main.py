import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.database import Base, SessionLocal, engine
from app.config import settings
from app.auth import get_password_hash
from app.models import User
from app.api import auth, users, hospitals, studies, forms, submissions, export

logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Oncology Research Data Collection API",
    description="API for collecting medical research data from multiple hospitals",
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)


@app.on_event("startup")
def startup_validate_secrets():
    """In production, require SECRET_KEY and ENCRYPTION_KEY to be set."""
    settings.validate_production_secrets()


@app.on_event("startup")
def startup_bootstrap_admin():
    """
    Create a one-time bootstrap admin only when the user table is empty.
    This lets fresh deployments access the app immediately.
    """
    bootstrap_email = "ctic_admin@medstudycollect.com"
    bootstrap_password = "change_me_soon"
    bootstrap_full_name = "ctic_admin"
    legacy_bootstrap_email = "ctic_admin@medstudy.local"

    db = SessionLocal()
    try:
        existing_user = db.query(User).first()
        if existing_user:
            # Backward compatibility: fix previously bootstrapped invalid `.local` email.
            legacy_user = db.query(User).filter(User.email == legacy_bootstrap_email).first()
            if legacy_user and not db.query(User).filter(User.email == bootstrap_email).first():
                legacy_user.email = bootstrap_email
                db.commit()
                logger.warning(
                    "Updated legacy bootstrap admin email from %s to %s.",
                    legacy_bootstrap_email,
                    bootstrap_email,
                )
            return

        admin_user = User(
            email=bootstrap_email,
            password_hash=get_password_hash(bootstrap_password),
            full_name=bootstrap_full_name,
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        logger.warning(
            "Bootstrap admin created for first login: email=%s full_name=%s. "
            "Rotate password immediately using /api/auth/change-password.",
            bootstrap_email,
            bootstrap_full_name,
        )
    except Exception:
        db.rollback()
        logger.exception("Failed creating one-time bootstrap admin user.")
    finally:
        db.close()


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.is_production:
            # Only set when served over HTTPS (e.g. behind TLS termination)
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware
cors_origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure CORS headers are included in HTTPException responses."""
    origin = request.headers.get("origin")
    if origin in cors_origins:
        response = JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            },
        )
        return response
    raise exc


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log exception server-side; return generic message to client."""
    logger.exception("Unhandled exception: %s", exc)
    origin = request.headers.get("origin")
    if origin in cors_origins:
        response = JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            },
        )
        return response
    raise exc

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(hospitals.router)
app.include_router(studies.router)
app.include_router(forms.router)
app.include_router(submissions.router)
app.include_router(export.router)


@app.get("/")
def root():
    payload = {
        "message": "Oncology Research Data Collection API",
        "version": "1.0.0",
    }
    if not settings.is_production:
        payload["docs"] = "/docs"
    return payload

