from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.config import settings
from app.api import auth, users, hospitals, studies, forms, submissions, export
import traceback

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Oncology Research Data Collection API",
    description="API for collecting medical research data from multiple hospitals",
    version="1.0.0"
)

# CORS middleware - must be added before other middleware
# Get CORS origins from settings
cors_origins = settings.cors_origins_list
print(f"CORS Origins configured: {cors_origins}")  # Debug log

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],
    max_age=3600,
)

# Add exception handler to ensure CORS headers are always included for HTTPExceptions
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Ensure CORS headers are included in HTTPException responses"""
    origin = request.headers.get("origin")
    if origin in cors_origins:
        response = JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            }
        )
        return response
    raise exc

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions and ensure CORS headers are included"""
    origin = request.headers.get("origin")
    print(f"Unhandled exception: {type(exc).__name__}: {str(exc)}")  # Debug logging
    import traceback
    traceback.print_exc()
    if origin in cors_origins:
        response = JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            }
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
    return {
        "message": "Oncology Research Data Collection API",
        "docs": "/docs",
        "version": "1.0.0"
    }

