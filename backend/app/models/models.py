from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_owner = Column(Boolean, default=False)  # Owner gets private access
    is_admin = Column(Boolean, default=False)  # Admin dashboard access
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    
    conversations = relationship("Conversation", back_populates="user")
    activity_logs = relationship("ActivityLog", back_populates="user")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role = Column(String) # 'user' or 'ai'
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # For AI messages
    sources = Column(Text, nullable=True) # JSON serialized list
    
    conversation = relationship("Conversation", back_populates="messages")
    feedback = relationship("Feedback", back_populates="message", uselist=False)

class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))
    rating = Column(String) # 'positive' or 'negative'
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    message = relationship("Message", back_populates="feedback")
    correction = relationship("Correction", back_populates="feedback", uselist=False)

class Correction(Base):
    __tablename__ = "corrections"
    
    id = Column(Integer, primary_key=True, index=True)
    feedback_id = Column(Integer, ForeignKey("feedback.id"))
    correct_answer = Column(Text)
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    
    feedback = relationship("Feedback", back_populates="correction")

class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # 'file', 'url', 'markdown'
    file_path = Column(String, nullable=True)      # Path on disk
    url = Column(String, nullable=True)            # For URL sources
    visibility = Column(String, default="public")  # 'public', 'private'
    status = Column(String, default="processing")  # 'processing', 'active', 'disabled', 'failed'
    enabled = Column(Boolean, default=True)
    chunk_count = Column(Integer, default=0)
    file_size = Column(BigInteger, default=0)
    error_message = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    last_indexed_at = Column(DateTime, nullable=True)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    activity_type = Column(String, nullable=False)  # 'login', 'question_asked', 'voice_question', 'doc_upload', 'knowledge_update'
    description = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON extra data
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="activity_logs")
