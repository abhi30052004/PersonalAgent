from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.models import Feedback, Correction, Message, Conversation, User

router = APIRouter()

class FeedbackRequest(BaseModel):
    message_id: int
    rating: str
    comment: str = None

class CorrectionRequest(BaseModel):
    feedback_id: int
    correct_answer: str

@router.post("/feedback")
def submit_feedback(
    req: FeedbackRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == req.message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    feedback = Feedback(message_id=req.message_id, rating=req.rating, comment=req.comment)
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback

@router.post("/corrections")
def submit_correction(
    req: CorrectionRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    feedback = db.query(Feedback).filter(Feedback.id == req.feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    msg = db.query(Message).filter(Message.id == feedback.message_id).first()
    conv = db.query(Conversation).filter(Conversation.id == msg.conversation_id).first()
    
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    correction = Correction(feedback_id=req.feedback_id, correct_answer=req.correct_answer)
    db.add(correction)
    db.commit()
    db.refresh(correction)
    return correction
