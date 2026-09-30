from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User

router = APIRouter()

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=req.email, 
        hashed_password=get_password_hash(req.password),
        is_owner=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "email": new_user.email}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    from datetime import datetime
    from app.models.models import ActivityLog
    try:
        user.last_active = datetime.utcnow()
        activity = ActivityLog(
            user_id=user.id,
            activity_type="login",
            description=f"{user.email} logged in",
            created_at=datetime.utcnow()
        )
        db.add(activity)
        db.commit()
    except Exception:
        pass
        
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "email": user.email, "is_admin": user.is_admin}}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "is_owner": current_user.is_owner,
        "is_admin": current_user.is_admin
    }
