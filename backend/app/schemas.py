from typing import Literal

from pydantic import BaseModel, Field


class EmotionResult(BaseModel):
    reasoning: str
    primary_emotion: str
    secondary_emotions: list[str] = Field(default_factory=list)
    valence: float = Field(ge=-1, le=1)
    arousal: float = Field(ge=0, le=1)
    intensity: float = Field(ge=0, le=1)
    polarity: Literal["positive", "negative", "neutral"]
    keywords: list[str] = Field(default_factory=list)
    color: str
    emotion_emoji: str
    explanation: str
    safety_flag: bool
    degraded: bool = False


class WaitingUser(BaseModel):
    session_id: str
    emotion: EmotionResult


class MatchResult(BaseModel):
    partner: WaitingUser
    distance: float
