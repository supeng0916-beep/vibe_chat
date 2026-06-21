from __future__ import annotations

import re

from app.schemas import EmotionResult


LEXICON = {
    "焦虑": {"valence": -0.62, "arousal": 0.82, "color": "#8b5cf6", "emoji": "😰", "words": ["焦虑", "担心", "紧张", "慌", "压力", "心跳"]},
    "低落": {"valence": -0.72, "arousal": 0.28, "color": "#3b82f6", "emoji": "😔", "words": ["难过", "低落", "孤独", "累", "疲惫", "失落", "撑不下去"]},
    "痛苦": {"valence": -0.9, "arousal": 0.68, "color": "#9f1239", "emoji": "💔", "words": ["痛苦", "崩溃", "伤害自己", "自杀", "活不下去"]},
    "愤怒": {"valence": -0.58, "arousal": 0.86, "color": "#ef4444", "emoji": "😤", "words": ["生气", "愤怒", "火大", "委屈", "不公平"]},
    "喜悦": {"valence": 0.78, "arousal": 0.72, "color": "#f97316", "emoji": "😄", "words": ["开心", "兴奋", "惊喜", "顺利", "期待"]},
    "平静": {"valence": 0.34, "arousal": 0.24, "color": "#14b8a6", "emoji": "🌿", "words": ["平静", "放松", "安稳", "舒服", "还好"]},
}

SAFETY_PATTERNS = re.compile(r"自杀|伤害自己|活不下去|撑不下去|结束生命|不想活")


def analyze_with_lexicon(text: str) -> EmotionResult:
    normalized = text.strip()
    scores: dict[str, int] = {}
    matched_words: list[str] = []

    for label, entry in LEXICON.items():
        count = sum(1 for word in entry["words"] if word in normalized)
        if count:
            scores[label] = count
            matched_words.extend(word for word in entry["words"] if word in normalized)

    if scores:
        primary = max(scores, key=lambda label: (scores[label], LEXICON[label]["arousal"]))
    else:
        primary = "平静"

    entry = LEXICON[primary]
    length_boost = min(len(normalized) / 120, 0.25)
    hit_boost = min(sum(scores.values()) * 0.12, 0.35)
    intensity = min(0.35 + length_boost + hit_boost, 1.0)
    valence = float(entry["valence"])
    arousal = float(entry["arousal"])
    safety_flag = bool(SAFETY_PATTERNS.search(normalized))

    if safety_flag:
        valence = min(valence, -0.82)
        arousal = max(arousal, 0.62)
        intensity = max(intensity, 0.85)

    polarity = "positive" if valence > 0.2 else "negative" if valence < -0.2 else "neutral"
    keywords = list(dict.fromkeys([primary, *matched_words]))[:6]
    secondary = [label for label in scores if label != primary][:3]

    return EmotionResult(
        reasoning="本地情绪词典降级分析：根据命中的中文情绪词估算效价、唤醒度和强度。",
        primary_emotion=primary,
        secondary_emotions=secondary,
        valence=round(valence, 2),
        arousal=round(arousal, 2),
        intensity=round(intensity, 2),
        polarity=polarity,
        keywords=keywords or [primary],
        color=str(entry["color"]),
        emotion_emoji=str(entry["emoji"]),
        explanation=f"我捕捉到你文字里的{primary}感，系统先用稳定的本地分析继续为你匹配同频的人。",
        safety_flag=safety_flag,
        degraded=True,
    )
