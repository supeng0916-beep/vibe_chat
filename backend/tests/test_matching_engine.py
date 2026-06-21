from app.matching.engine import MatchingEngine
from app.schemas import EmotionResult, WaitingUser


def emotion(valence: float, arousal: float, label: str = "平静") -> EmotionResult:
    return EmotionResult(
        reasoning="test",
        primary_emotion=label,
        secondary_emotions=[],
        valence=valence,
        arousal=arousal,
        intensity=0.6,
        polarity="neutral",
        keywords=[label],
        color="#78c6a3",
        emotion_emoji=".",
        explanation="测试情绪",
        safety_flag=False,
        degraded=True,
    )


def test_matching_uses_nearest_emotion_vector():
    engine = MatchingEngine(strict_threshold=0.35)
    engine.enqueue(WaitingUser(session_id="far", emotion=emotion(0.8, 0.1, "轻松")))
    engine.enqueue(WaitingUser(session_id="near", emotion=emotion(-0.55, 0.78, "焦虑")))

    match = engine.find_match("me", emotion(-0.5, 0.75, "焦虑"))

    assert match is not None
    assert match.partner.session_id == "near"
    assert match.distance < 0.1


def test_matching_returns_none_when_no_candidate_within_threshold():
    engine = MatchingEngine(strict_threshold=0.2)
    engine.enqueue(WaitingUser(session_id="far", emotion=emotion(0.9, 0.0, "满足")))

    match = engine.find_match("me", emotion(-0.9, 1.0, "恐慌"))

    assert match is None
