from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base

# Import all models to ensure they are registered before Base.metadata.create_all
from app.models import models

from app.api.chat import router as chat_router
from app.api.auth import router as auth_router
from app.api.feedback import router as feedback_router
from app.api.admin import router as admin_router

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Digital Twin Backend")

from app.core.config import settings
import logging

if not settings.ELEVENLABS_VOICE_ID:
    logging.warning("ELEVENLABS_VOICE_ID is not configured")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(feedback_router, prefix="/api", tags=["Feedback & Corrections"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is running"}
