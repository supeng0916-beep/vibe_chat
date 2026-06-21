from app.schemas import EmotionResult, WaitingUser
from app.state import matching_engine, reset_session_journey, session_emotions, session_rooms


def emotion(label: str = "焦虑") -> EmotionResult:
    return EmotionResult(
        reasoning="test",
        primary_emotion=label,
        secondary_emotions=[],
        valence=-0.45,
        arousal=0.72,
        intensity=0.6,
        polarity="negative",
        keywords=[label],
        color="#8b5cf6",
        emotion_emoji=".",
        explanation="测试情绪",
        safety_flag=False,
        degraded=True,
    )


def test_reset_session_journey_clears_previous_room_and_waiting_queue():
    session_id = "same-browser-session"
    session_emotions[session_id] = emotion()
    session_rooms[session_id] = "old-room"
    matching_engine.enqueue(WaitingUser(session_id=session_id, emotion=emotion()))

    reset_session_journey(session_id)

    assert session_id not in session_rooms
    assert matching_engine.find_match("other", emotion()) is None
