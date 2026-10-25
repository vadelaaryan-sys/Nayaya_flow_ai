from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database import get_db
from app.ai_copilot import (
    ask_copilot,
    get_current_gemini_key,
    set_current_gemini_key,
    test_gemini_key,
    DISCLAIMER,
)

router = APIRouter(prefix="/ai", tags=["AI Copilot"])


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)
    case_id: Optional[int] = None
    history: List[Dict[str, str]] = Field(default_factory=list)


class ConfigureKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=1)


class AIStatusResponse(BaseModel):
    gemini_configured: bool
    active_engine: str
    model: str
    disclaimer: str


@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    """Returns whether Gemini API is active or if local offline NLP engine is serving."""
    key = get_current_gemini_key()
    configured = bool(key and len(key) > 5)
    return AIStatusResponse(
        gemini_configured=configured,
        active_engine="Google Gemini API (Live LLM)" if configured else "NyayaFlow Local Procedural NLP Engine",
        model="gemini-1.5-flash" if configured else "rule-nlp-v1.2-offline",
        disclaimer=DISCLAIMER,
    )


@router.post("/configure-key")
async def configure_api_key(payload: ConfigureKeyRequest):
    """Save and verify a Google Gemini API Key."""
    test_res = await test_gemini_key(payload.api_key)
    if not test_res["valid"]:
        raise HTTPException(status_code=400, detail=test_res["message"])

    saved = set_current_gemini_key(payload.api_key)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to persist API key to local environment.")

    return {
        "status": "success",
        "message": "Google Gemini API key successfully verified and activated!",
        "engine": "Google Gemini API (Live LLM)",
        "model": "gemini-1.5-flash",
    }


@router.post("/clear-key")
def clear_api_key():
    """Removes API key and switches back to local procedural NLP engine."""
    set_current_gemini_key("")
    return {
        "status": "success",
        "message": "Switched back to local procedural NLP engine (100% offline).",
    }


@router.post("/chat")
async def chat_with_copilot(payload: ChatMessageRequest, db: Session = Depends(get_db)):
    """Conversational endpoint for procedural queries, delay diagnosis, and draft notices."""
    result = await ask_copilot(
        message=payload.message,
        case_id=payload.case_id,
        history=payload.history,
        db=db,
    )
    return result
