from app.matching.engine import MatchingEngine

matching_engine = MatchingEngine()
session_emotions: dict[str, object] = {}
session_rooms: dict[str, str] = {}
room_bots: set[str] = set()
