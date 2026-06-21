from app.llm.fallback import analyze_with_lexicon


def test_fallback_detects_anxious_negative_high_arousal():
    result = analyze_with_lexicon("我今天特别焦虑，心跳很快，担心明天的面试会失败")

    assert result.primary_emotion == "焦虑"
    assert result.polarity == "negative"
    assert result.valence < 0
    assert result.arousal > 0.55
    assert result.intensity > 0.5
    assert result.degraded is True
    assert "焦虑" in result.keywords


def test_fallback_sets_safety_flag_for_crisis_language():
    result = analyze_with_lexicon("我真的撑不下去了，想伤害自己")

    assert result.safety_flag is True
    assert result.primary_emotion in {"痛苦", "低落", "焦虑"}
