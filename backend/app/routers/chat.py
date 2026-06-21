import json

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.models import ChatSession, EmotionProfile, Message, RoomMember
from app.schemas import EmotionResult
from app.services.conversation import generate_companion_reply, generate_icebreaker
from app.state import room_bots, session_emotions, session_rooms
from app.ws.manager import manager

router = APIRouter(tags=["chat"])


class IcebreakerRequest(BaseModel):
    room_id: str


def _member_emotions(db: Session, room_id: str) -> list[dict]:
    members = db.exec(select(RoomMember).where(RoomMember.room_id == room_id)).all()
    out: list[dict] = []
    for member in members:
        if not member.emotion_profile_id:
            continue
        profile = db.get(EmotionProfile, member.emotion_profile_id)
        if profile:
            out.append(
                {
                    "primary_emotion": profile.primary_emotion,
                    "valence": profile.valence,
                    "arousal": profile.arousal,
                }
            )
    return out


@router.get("/api/rooms/{room_id}/messages")
def messages(room_id: str, db: Session = Depends(get_session)) -> list[Message]:
    return db.exec(select(Message).where(Message.room_id == room_id).order_by(Message.created_at)).all()


@router.get("/api/rooms/{room_id}/members")
def members(room_id: str, db: Session = Depends(get_session)) -> list[dict]:
    """Anonymous member cards incl. emotion badge for the chat sidebar."""
    rows = db.exec(select(RoomMember).where(RoomMember.room_id == room_id)).all()
    cards: list[dict] = []
    for row in rows:
        chat_session = db.get(ChatSession, row.session_id)
        profile = db.get(EmotionProfile, row.emotion_profile_id) if row.emotion_profile_id else None
        cards.append(
            {
                "session_id": row.session_id,
                "nickname": chat_session.anon_nickname if chat_session else "匿名同频者",
                "avatar": chat_session.avatar if chat_session else "🌙",
                "primary_emotion": profile.primary_emotion if profile else None,
                "emotion_emoji": profile.emotion_emoji if profile else None,
                "color": profile.color if profile else (chat_session.theme_color if chat_session else "#8b5cf6"),
                "valence": profile.valence if profile else None,
                "arousal": profile.arousal if profile else None,
            }
        )
    # Surface the AI companion as a member so the UI can show who you're talking to.
    if room_id in room_bots and not any(c["session_id"] == "ai-companion" for c in cards):
        cards.append(
            {
                "session_id": "ai-companion",
                "nickname": "同频陪伴",
                "avatar": "🫧",
                "primary_emotion": "同频",
                "emotion_emoji": "🫧",
                "color": "#14b8a6",
                "valence": None,
                "arousal": None,
            }
        )
    return cards


@router.post("/api/conversation/icebreaker")
async def icebreaker(request: IcebreakerRequest, db: Session = Depends(get_session)) -> dict:
    emotions = _member_emotions(db, request.room_id)
    return {"text": await generate_icebreaker(emotions)}


def _emotion_for(session_id: str) -> EmotionResult | None:
    value = session_emotions.get(session_id)
    return value if isinstance(value, EmotionResult) else None


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    await manager.connect(session_id, websocket)
    room_id = session_rooms.get(session_id)
    if room_id:
        manager.join_room(room_id, session_id)
    try:
        while True:
            payload = await websocket.receive_json()
            room_id = payload.get("room_id") or session_rooms.get(session_id)
            if not room_id:
                continue
            kind = payload.get("type")
            if kind == "message":
                content = str(payload.get("content", "")).strip()
                if not content:
                    continue
                await _handle_message(room_id, session_id, content)
            elif kind == "typing":
                await manager.broadcast_room(
                    room_id, {"type": "typing", "session_id": session_id}, exclude=session_id
                )
    except WebSocketDisconnect:
        # Only broadcast departure if this was the session's live socket
        # (a stale socket from a previous page must not evict the current one).
        if manager.disconnect(session_id, websocket) and room_id:
            await manager.broadcast_room(
                room_id, {"type": "system", "event": "partner_left", "session_id": session_id}, exclude=session_id
            )


async def _handle_message(room_id: str, session_id: str, content: str) -> None:
    with next(get_session()) as db:
        message = Message(room_id=room_id, session_id=session_id, content=content)
        db.add(message)
        db.commit()
        db.refresh(message)
        await manager.broadcast_room(room_id, {"type": "message", "message": message.model_dump(mode="json")})

        if room_id not in room_bots:
            return

        # AI companion: signal typing, then reply with a real LLM call.
        await manager.broadcast_room(room_id, {"type": "typing", "session_id": "ai-companion"})
        recent = db.exec(
            select(Message).where(Message.room_id == room_id).order_by(Message.created_at.desc()).limit(8)
        ).all()
        history = [
            ("我" if m.session_id == "ai-companion" else "对方", m.content)
            for m in reversed(recent)
        ]
        reply = await generate_companion_reply(_emotion_for(session_id), history)
        bot = Message(room_id=room_id, session_id="ai-companion", content=reply)
        db.add(bot)
        db.commit()
        db.refresh(bot)
        await manager.broadcast_room(room_id, {"type": "message", "message": bot.model_dump(mode="json")})
