import json

from sqlmodel import Session

from app.llm.factory import get_provider
from app.llm.fallback import analyze_with_lexicon
from app.models import EmotionProfile
from app.schemas import EmotionResult


async def analyze_emotion(text: str) -> EmotionResult:
    provider = get_provider()
    try:
        return await provider.analyze_emotion(text)
    except Exception:
        return analyze_with_lexicon(text)


def save_emotion(db: Session, session_id: str, text: str, result: EmotionResult) -> EmotionProfile:
    profile = EmotionProfile(
        session_id=session_id,
        raw_text=text,
        valence=result.valence,
        arousal=result.arousal,
        intensity=result.intensity,
        primary_emotion=result.primary_emotion,
        secondary_emotions=json.dumps(result.secondary_emotions, ensure_ascii=False),
        keywords=json.dumps(result.keywords, ensure_ascii=False),
        color=result.color,
        emotion_emoji=result.emotion_emoji,
        explanation=result.explanation,
        safety_flag=result.safety_flag,
        degraded=result.degraded,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
