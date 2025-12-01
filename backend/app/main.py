from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.config import settings
from app.api import auth, users, hospitals, studies, forms, submissions, export

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

# Explicitly list allowed headers (wildcard might not work in all cases)
allowed_headers = [
    "Accept",
    "Accept-Language",
    "Content-Language",
    "Content-Type",
    "Authorization",
    "X-Requested-With",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=allowed_headers,
    expose_headers=["*"],
    max_age=3600,
)

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

