from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Field, SQLModel


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class ChatSession(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    anon_nickname: str
    avatar: str
    theme_color: str
    created_at: datetime = Field(default_factory=now_utc)


class EmotionProfile(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    session_id: str = Field(index=True)
    raw_text: str
    valence: float
    arousal: float
    intensity: float
    primary_emotion: str
    secondary_emotions: str = "[]"
    keywords: str = "[]"
    color: str
    emotion_emoji: str
    explanation: str
    safety_flag: bool = False
    degraded: bool = False
    created_at: datetime = Field(default_factory=now_utc)


class Room(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    mode: str = "similar"
    status: str = "active"
    created_at: datetime = Field(default_factory=now_utc)


class RoomMember(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    room_id: str = Field(index=True)
    session_id: str = Field(index=True)
    emotion_profile_id: str | None = None


class Message(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    room_id: str = Field(index=True)
    session_id: str = Field(index=True)
    content: str
    created_at: datetime = Field(default_factory=now_utc)
