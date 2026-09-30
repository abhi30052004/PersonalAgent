import os
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel
from app.core.config import settings

def get_llm() -> BaseChatModel:
    """Returns configured LLM based on available keys, prioritizing Groq then OpenAI."""
    provider = settings.LLM_PROVIDER.lower()
    
    if provider == "openai" and settings.OPENAI_API_KEY:
        return ChatOpenAI(api_key=settings.OPENAI_API_KEY, model="gpt-4o-mini")
    elif provider == "groq" and settings.GROQ_API_KEY:
        return ChatGroq(api_key=settings.GROQ_API_KEY, model_name="llama-3.1-8b-instant")
    elif settings.GROQ_API_KEY:
        return ChatGroq(api_key=settings.GROQ_API_KEY, model_name="llama-3.1-8b-instant")
    elif settings.OPENAI_API_KEY:
        return ChatOpenAI(api_key=settings.OPENAI_API_KEY, model="gpt-4o-mini")
    else:
        # Fallback to a mock LLM if no keys are provided
        if not settings.ALLOW_MOCK_LLM or settings.ENVIRONMENT.lower() == "production":
            raise ValueError("No valid LLM API key configured. Please configure GROQ_API_KEY or OPENAI_API_KEY.")
            
        class MockLLM(BaseChatModel):
            def _generate(self, messages, stop=None, run_manager=None, **kwargs):
                from langchain_core.messages import AIMessage
                from langchain_core.outputs import ChatResult, ChatGeneration
                
                # Simple mock response
                content = "I am PersonaAI. (Note: No API keys configured, returning mock generation.)"
                return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])
            @property
            def _llm_type(self) -> str: return "mock"
        
        return MockLLM()
