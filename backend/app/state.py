from app.matching.engine import MatchingEngine

matching_engine = MatchingEngine()
session_emotions: dict[str, object] = {}
session_rooms: dict[str, str] = {}
room_bots: set[str] = set()


def reset_session_journey(session_id: str) -> None:
    """Start a fresh emotion-to-match journey for a returning anonymous user."""
    matching_engine.remove(session_id)
    session_rooms.pop(session_id, None)
