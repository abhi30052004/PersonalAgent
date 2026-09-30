from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import json

from app.agent.graph import app_graph
from app.api.deps import get_current_user, get_db
from app.models.models import User, Conversation, Message, ActivityLog

router = APIRouter()

from typing import List, Dict, Any, Optional
import requests
import os
from fastapi.responses import Response, JSONResponse
from app.core.config import settings

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
    tone: Optional[str] = "Natural"
    
class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
    conversation_id: int
    message_id: int

class ConversationInfo(BaseModel):
    id: int
    title: str
    created_at: Any
    
class MessageInfo(BaseModel):
    id: int
    role: str
    content: str
    sources: List[str] = []
    created_at: Any

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    tone: Optional[str] = "Natural"

@router.post("/", response_model=ChatResponse)
def chat_endpoint(
    req: ChatRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Handle conversation
    if req.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conv.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
    else:
        # Title can be derived from the first message
        title = req.message[:30] + "..." if len(req.message) > 30 else req.message
        conv = Conversation(user_id=current_user.id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save User message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.message
    )
    db.add(user_msg)
    db.commit()

    # Get chat history
    chat_history = []
    if conv:
        past_msgs = db.query(Message).filter(Message.conversation_id == conv.id).order_by(Message.created_at.asc()).all()
        for msg in past_msgs:
            if msg.role == "user":
                chat_history.append({"role": "user", "content": msg.content})
            elif msg.role == "ai":
                chat_history.append({"role": "ai", "content": msg.content})
                
    # Initialize state
    initial_state = {
        "question": req.message,
        "chat_history": chat_history,
        "intent": "",
        "retrieved_docs": [],
        "draft_response": "",
        "grounded": False,
        "citations": [],
        "final_response": "",
        "is_owner": current_user.is_owner,
        "tone": req.tone
    }
    
    # Run the graph
    try:
        result = app_graph.invoke(initial_state)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Agent Error: {str(e)}")
    
    final_answer = result.get("final_response", "")
    citations = result.get("citations", [])
    
    # Save Assistant message
    ai_msg = Message(
        conversation_id=conv.id,
        role="ai",
        content=final_answer,
        sources=json.dumps(citations)
    )
    db.add(ai_msg)
    db.commit()

    # Log activity
    try:
        from datetime import datetime
        activity = ActivityLog(
            user_id=current_user.id,
            activity_type="question_asked",
            description=f"Asked: {req.message[:80]}",
            metadata_json=json.dumps({"sources": citations, "conversation_id": conv.id}),
            created_at=datetime.utcnow()
        )
        db.add(activity)
        current_user.last_active = datetime.utcnow()
        db.commit()
    except Exception:
        pass
    
    return ChatResponse(
        answer=final_answer,
        sources=citations,
        conversation_id=conv.id,
        message_id=ai_msg.id
    )

@router.get("/conversations", response_model=List[ConversationInfo])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convs = db.query(Conversation).filter(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc()).all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in convs]

@router.get("/conversations/{conversation_id}", response_model=List[MessageInfo])
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
        
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
    
    result = []
    for msg in messages:
        sources = []
        if msg.sources:
            try:
                sources = json.loads(msg.sources)
            except:
                pass
        result.append({
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "sources": sources,
            "created_at": msg.created_at
        })
    return result

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this conversation")
        
    db.query(Message).filter(Message.conversation_id == conversation_id).delete()
    db.delete(conv)
    db.commit()
    return {"status": "deleted"}

@router.post("/tts")
def text_to_speech(
    req: TTSRequest,
    current_user: User = Depends(get_current_user)
):
    api_key = settings.ELEVENLABS_API_KEY
    voice_id = req.voice_id or settings.ELEVENLABS_VOICE_ID
    model_id = settings.ELEVENLABS_MODEL_ID
    
    if not api_key or api_key == "your_key_here":
        return JSONResponse(status_code=500, content={"success": False, "fallback": True, "error": "TTS provider API key not configured"})
    if not voice_id:
        print("ELEVENLABS_VOICE_ID is not configured")
        return JSONResponse(status_code=500, content={"success": False, "fallback": True, "error": "TTS provider Voice ID not configured"})
        
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    
    data = {
        "text": req.text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        
        if response.status_code != 200:
            return JSONResponse(status_code=response.status_code if response.status_code not in (401, 403) else 502, content={"success": False, "fallback": True, "error": f"ElevenLabs API Error: {response.status_code}"})
            
        return Response(content=response.content, media_type="audio/mpeg")
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "fallback": True, "error": f"TTS provider network error: {str(e)}"})
