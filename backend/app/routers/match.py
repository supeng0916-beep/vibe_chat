from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.models import EmotionProfile, Room, RoomMember
from app.schemas import WaitingUser
from app.state import matching_engine, room_bots, session_emotions, session_rooms
from app.ws.manager import manager

router = APIRouter(prefix="/api/match", tags=["match"])

RELAXED_THRESHOLD = 0.6


class MatchRequest(BaseModel):
    session_id: str
    mode: str = "similar"


def latest_profile_id(db: Session, session_id: str) -> str | None:
    statement = (
        select(EmotionProfile)
        .where(EmotionProfile.session_id == session_id)
        .order_by(EmotionProfile.created_at.desc())
    )
    profile = db.exec(statement).first()
    return profile.id if profile else None


async def _pair_room(db: Session, mode: str, a: str, b: str, distance: float) -> str:
    room = Room(mode=mode)
    db.add(room)
    db.commit()
    db.refresh(room)
    for session_id in (a, b):
        db.add(RoomMember(room_id=room.id, session_id=session_id, emotion_profile_id=latest_profile_id(db, session_id)))
        session_rooms[session_id] = room.id
        manager.join_room(room.id, session_id)
    db.commit()
    await manager.broadcast_room(
        room.id, {"type": "system", "event": "match_found", "room_id": room.id, "distance": round(distance, 3)}
    )
    return room.id


@router.post("")
async def match(request: MatchRequest, db: Session = Depends(get_session)) -> dict:
    emotion = session_emotions.get(request.session_id)
    if emotion is None:
        raise HTTPException(status_code=400, detail="请先完成情绪分析")

    found = matching_engine.find_match(request.session_id, emotion)
    if found:
        room_id = await _pair_room(db, request.mode, request.session_id, found.partner.session_id, found.distance)
        return {"status": "matched", "room_id": room_id, "distance": found.distance}

    matching_engine.enqueue(WaitingUser(session_id=request.session_id, emotion=emotion))
    return {"status": "waiting"}


@router.post("/fallback")
async def fallback(request: MatchRequest, db: Session = Depends(get_session)) -> dict:
    """Called by the client after the wait timeout: relaxed match, else AI companion."""
    if request.session_id in session_rooms:
        return {"status": "matched", "room_id": session_rooms[request.session_id]}

    emotion = session_emotions.get(request.session_id)
    if emotion is None:
        raise HTTPException(status_code=400, detail="请先完成情绪分析")

    found = matching_engine.find_match(request.session_id, emotion, threshold=RELAXED_THRESHOLD)
    if found:
        room_id = await _pair_room(db, request.mode, request.session_id, found.partner.session_id, found.distance)
        return {"status": "matched", "room_id": room_id, "distance": found.distance, "fallback": "relaxed"}

    # No one nearby — give a warm AI companion so the user is never left waiting.
    matching_engine.remove(request.session_id)
    room = Room(mode="ai", status="active")
    db.add(room)
    db.commit()
    db.refresh(room)
    db.add(
        RoomMember(room_id=room.id, session_id=request.session_id, emotion_profile_id=latest_profile_id(db, request.session_id))
    )
    db.commit()
    session_rooms[request.session_id] = room.id
    manager.join_room(room.id, request.session_id)
    room_bots.add(room.id)
    return {"status": "matched", "room_id": room.id, "fallback": "ai_companion"}


@router.get("/status")
def match_status(session_id: str) -> dict:
    if session_id in session_rooms:
        return {"status": "matched", "room_id": session_rooms[session_id]}
    return {"status": "waiting"}
