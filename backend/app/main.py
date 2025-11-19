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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

