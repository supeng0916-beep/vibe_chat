from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.db import get_session
from app.models import EmotionProfile
from app.services.emotion import analyze_emotion, save_emotion
from app.state import session_emotions

router = APIRouter(prefix="/api/emotion", tags=["emotion"])


class AnalyzeRequest(BaseModel):
    session_id: str
    text: str = Field(min_length=1, max_length=1000)


@router.post("/analyze")
async def analyze(request: AnalyzeRequest, db: Session = Depends(get_session)) -> dict:
    result = await analyze_emotion(request.text)
    profile = save_emotion(db, request.session_id, request.text, result)
    session_emotions[request.session_id] = result
    data = result.model_dump()
    data["emotion_profile_id"] = profile.id
    return data


@router.get("/history")
def history(session_id: str, db: Session = Depends(get_session)) -> list[EmotionProfile]:
    return db.exec(select(EmotionProfile).where(EmotionProfile.session_id == session_id)).all()
