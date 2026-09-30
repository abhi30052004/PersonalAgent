import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PersonaAI"
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    CHROMA_PERSIST_DIRECTORY: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "chroma_db")
    
    DATABASE_URL: str = "sqlite:///./PersonaAI.db"
    
    LLM_PROVIDER: str = "groq"
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"
    JWT_SECRET: str = "super_secret_jwt_key_for_dev_only"
    
    ENVIRONMENT: str = "development"
    ALLOW_MOCK_LLM: bool = True
    CORS_ORIGINS: str = "http://localhost:5173"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
