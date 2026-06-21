from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.models import ChatSession
from app.services.identity import create_identity

router = APIRouter(prefix="/api", tags=["session"])


@router.post("/session")
def create_session(db: Session = Depends(get_session)) -> dict:
    nickname, avatar, color = create_identity()
    chat_session = ChatSession(anon_nickname=nickname, avatar=avatar, theme_color=color)
    db.add(chat_session)
    db.commit()
    db.refresh(chat_session)
    return {"session_id": chat_session.id, "nickname": nickname, "avatar": avatar, "theme_color": color}
