"""
Admin API — protected by is_admin role.
Endpoints:
  GET  /api/admin/stats
  GET  /api/admin/users
  GET  /api/admin/activity
  GET  /api/admin/knowledge
  POST /api/admin/knowledge/upload
  POST /api/admin/knowledge/url
  PATCH /api/admin/knowledge/{id}/toggle
  DELETE /api/admin/knowledge/{id}
  POST /api/admin/knowledge/{id}/reindex
  GET  /api/admin/knowledge/{id}/content
  PATCH /api/admin/knowledge/{id}/content
  POST /api/admin/make-admin   (promote user to admin — owner-only)
"""

import os
import json
import shutil
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_admin_user
from app.models.models import User, Conversation, Message, KnowledgeSource, ActivityLog
from app.services.knowledge_processor import (
    extract_text_from_file,
    extract_text_from_url,
    chunk_and_index,
    delete_source_from_chroma,
    get_all_sources_from_chroma,
    SUPPORTED_EXTENSIONS,
    MAX_FILE_SIZE_MB,
)
from app.core.config import settings

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def log_activity(db: Session, user_id: Optional[int], activity_type: str, description: str, metadata: dict = None):
    log = ActivityLog(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        metadata_json=json.dumps(metadata) if metadata else None,
        created_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_sources = db.query(KnowledgeSource).filter(KnowledgeSource.status == "active").count()
    total_messages = db.query(Message).filter(Message.role == "user").count()
    docs_uploaded = db.query(KnowledgeSource).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_knowledge_sources": total_sources,
        "questions_asked": total_messages,
        "documents_uploaded": docs_uploaded,
    }


# ─── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    search: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))
    users = query.order_by(User.created_at.desc()).all()

    result = []
    for u in users:
        conv_count = db.query(Conversation).filter(Conversation.user_id == u.id).count()
        msg_count = db.query(Message).join(Conversation).filter(
            Conversation.user_id == u.id, Message.role == "user"
        ).count()
        result.append({
            "id": u.id,
            "email": u.email,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "is_owner": u.is_owner,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_active": u.last_active.isoformat() if u.last_active else None,
            "conversation_count": conv_count,
            "question_count": msg_count,
        })
    return result


@router.post("/make-admin")
def make_admin(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_owner:
        raise HTTPException(status_code=403, detail="Only the owner can promote users to admin")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    db.commit()
    return {"message": f"{user.email} is now an admin"}

@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_owner:
        raise HTTPException(status_code=403, detail="Cannot deactivate the owner")
    
    user.is_active = not user.is_active
    db.commit()
    
    action = "activated" if user.is_active else "deactivated"
    log_activity(db, admin.id, "user_update", f"User {user.email} {action}")
    
    return {"id": user.id, "is_active": user.is_active, "message": f"User {action}"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_owner:
        raise HTTPException(status_code=403, detail="Cannot delete the owner")
        
    email = user.email
    db.delete(user)
    db.commit()
    
    log_activity(db, admin.id, "user_delete", f"Deleted user {email}")
    return {"message": f"User {email} deleted successfully"}


# ─── Activity ──────────────────────────────────────────────────────────────────

@router.get("/activity")
def get_activity(
    user_id: Optional[int] = None,
    email: Optional[str] = None,
    activity_type: Optional[str] = None,
    limit: int = 100,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(ActivityLog)
    if email:
        query = query.join(User, ActivityLog.user_id == User.id).filter(User.email.ilike(f"%{email}%"))
    if user_id:
        query = query.filter(ActivityLog.user_id == user_id)
    if activity_type:
        query = query.filter(ActivityLog.activity_type == activity_type)

    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()

    result = []
    for log in logs:
        user_email = None
        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            user_email = user.email if user else None

        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_email": user_email,
            "activity_type": log.activity_type,
            "description": log.description,
            "metadata": json.loads(log.metadata_json) if log.metadata_json else None,
            "created_at": log.created_at.isoformat(),
        })
    return result


# ─── Knowledge Base ────────────────────────────────────────────────────────────

@router.get("/knowledge")
def list_knowledge(
    search: Optional[str] = None,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    query = db.query(KnowledgeSource)
    if search:
        query = query.filter(KnowledgeSource.name.ilike(f"%{search}%"))
    sources = query.order_by(KnowledgeSource.created_at.desc()).all()

    chroma_counts = get_all_sources_from_chroma()

    result = []
    for s in sources:
        live_chunks = chroma_counts.get(str(s.id), s.chunk_count)
        result.append({
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "file_path": s.file_path,
            "url": s.url,
            "visibility": s.visibility,
            "status": s.status,
            "enabled": s.enabled,
            "chunk_count": live_chunks,
            "file_size": s.file_size,
            "error_message": s.error_message,
            "uploaded_by": s.uploaded_by,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "last_indexed_at": s.last_indexed_at.isoformat() if s.last_indexed_at else None,
        })
    return result


@router.get("/knowledge/{source_id}/content")
def get_knowledge_content(
    source_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    if not source.file_path or not os.path.exists(source.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    with open(source.file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    return {"content": content, "name": source.name}


class ContentUpdate(BaseModel):
    content: str

@router.patch("/knowledge/{source_id}/content")
def update_knowledge_content(
    source_id: int,
    body: ContentUpdate,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    if not source.file_path:
        raise HTTPException(status_code=400, detail="Cannot edit URL sources inline")

    with open(source.file_path, "w", encoding="utf-8") as f:
        f.write(body.content)

    source.updated_at = datetime.utcnow()
    source.status = "processing"
    db.commit()

    background_tasks.add_task(_reindex_source, source_id, db)
    log_activity(db, admin.id, "knowledge_update", f"Edited content of {source.name}")
    return {"message": "Content saved and re-indexing started"}


@router.patch("/knowledge/{source_id}/toggle")
def toggle_knowledge(
    source_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")

    source.enabled = not source.enabled
    source.status = "active" if source.enabled else "disabled"
    source.updated_at = datetime.utcnow()
    db.commit()

    action = "enabled" if source.enabled else "disabled"
    log_activity(db, admin.id, "knowledge_update", f"Knowledge source '{source.name}' {action}")
    return {"id": source.id, "enabled": source.enabled, "status": source.status}


@router.delete("/knowledge/{source_id}")
def delete_knowledge(
    source_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")

    # Remove from ChromaDB
    delete_source_from_chroma(source_id)

    # Remove file from disk
    if source.file_path and os.path.exists(source.file_path):
        try:
            os.remove(source.file_path)
        except Exception:
            pass

    name = source.name
    db.delete(source)
    db.commit()
    log_activity(db, admin.id, "knowledge_delete", f"Deleted knowledge source '{name}'")
    return {"message": f"Knowledge source '{name}' deleted"}


@router.post("/knowledge/{source_id}/reindex")
def reindex_knowledge(
    source_id: int,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    source = db.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Knowledge source not found")

    source.status = "processing"
    source.error_message = None
    db.commit()

    background_tasks.add_task(_reindex_source, source_id, db)
    return {"message": "Re-indexing started"}


def _reindex_source(source_id: int, db: Session):
    """Background task: re-index a knowledge source."""
    from app.core.database import SessionLocal
    db2 = SessionLocal()
    try:
        source = db2.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
        if not source:
            return

        if source.source_type == "url":
            text = extract_text_from_url(source.url)
        else:
            ext = os.path.splitext(source.file_path)[1].lower() if source.file_path else ".txt"
            text = extract_text_from_file(source.file_path, ext)

        chunk_count = chunk_and_index(
            text=text,
            source_name=source.name,
            source_id=source_id,
            source_type=source.source_type,
            visibility=source.visibility,
            filename=source.name,
        )

        source.status = "active"
        source.enabled = True
        source.chunk_count = chunk_count
        source.last_indexed_at = datetime.utcnow()
        source.error_message = None
        db2.commit()
    except Exception as e:
        source = db2.query(KnowledgeSource).filter(KnowledgeSource.id == source_id).first()
        if source:
            source.status = "failed"
            source.error_message = str(e)
            db2.commit()
    finally:
        db2.close()


# ─── Upload File ───────────────────────────────────────────────────────────────

@router.post("/knowledge/upload")
async def upload_knowledge(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    visibility: str = Form(default="public"),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File too large (max {MAX_FILE_SIZE_MB}MB)")

    # Save to disk
    safe_name = file.filename.replace(" ", "_")
    file_path = os.path.join(UPLOADS_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    source = KnowledgeSource(
        name=file.filename,
        source_type="markdown" if ext == ".md" else "file",
        file_path=file_path,
        visibility=visibility,
        status="processing",
        file_size=len(content),
        uploaded_by=admin.id,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    background_tasks.add_task(_reindex_source, source.id, db)
    log_activity(db, admin.id, "doc_upload", f"Uploaded '{file.filename}'", {"size_mb": round(size_mb, 2)})

    return {
        "id": source.id,
        "name": source.name,
        "status": "processing",
        "message": "File uploaded. Processing in background..."
    }


# ─── Add URL ───────────────────────────────────────────────────────────────────

class UrlRequest(BaseModel):
    url: str
    name: Optional[str] = None
    visibility: str = "public"

@router.post("/knowledge/url")
def add_url_knowledge(
    req: UrlRequest,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if not req.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL. Must start with http:// or https://")

    name = req.name or req.url
    source = KnowledgeSource(
        name=name,
        source_type="url",
        url=req.url,
        visibility=req.visibility,
        status="processing",
        uploaded_by=admin.id,
    )
    db.add(source)
    db.commit()
    db.refresh(source)

    background_tasks.add_task(_reindex_source, source.id, db)
    log_activity(db, admin.id, "knowledge_update", f"Added URL source: {req.url}")

    return {
        "id": source.id,
        "name": name,
        "status": "processing",
        "message": "URL added. Fetching and processing in background..."
    }
