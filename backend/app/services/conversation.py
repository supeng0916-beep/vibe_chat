"""Conversation helpers: AI icebreaker + AI companion replies.

Both run through the active LLM provider (OpenAI- or Anthropic-standard) so the
"AI is doing the social work" promise is real, not canned strings.
"""
from __future__ import annotations

from app.llm.factory import get_provider
from app.llm.prompts import ICEBREAKER_SYSTEM, companion_system
from app.schemas import EmotionResult

_ICEBREAKER_FALLBACK = "你们此刻的情绪频率很接近。先从最想被理解的一件小事说起吧。"
_COMPANION_FALLBACK = "我在听，你慢慢说，不用急着说清楚。"


async def generate_icebreaker(emotions: list[dict]) -> str:
    if not emotions:
        return _ICEBREAKER_FALLBACK
    desc = "；".join(
        f"一位主情绪是「{e.get('primary_emotion', '复杂')}」(效价 {float(e.get('valence', 0)):+.1f}、唤醒 {float(e.get('arousal', 0)):.1f})"
        for e in emotions
    )
    prompt = f"刚被匹配到一起的人，情绪是：{desc}。请写一句破冰开场白。"
    try:
        text = (await get_provider().generate(ICEBREAKER_SYSTEM, prompt)).strip()
        return text or _ICEBREAKER_FALLBACK
    except Exception:
        return _ICEBREAKER_FALLBACK


async def generate_companion_reply(emotion: EmotionResult | None, history: list[tuple[str, str]]) -> str:
    """history: list of (role, content) where role is '对方' or '我'."""
    valence = emotion.valence if emotion else 0.0
    arousal = emotion.arousal if emotion else 0.4
    primary = emotion.primary_emotion if emotion else "平静"
    system = companion_system(valence, arousal, primary)
    convo = "\n".join(f"{role}：{content}" for role, content in history[-6:])
    prompt = f"你们最近的对话：\n{convo}\n\n请以同频网友的语气，自然地回应对方最后一句话。只输出你要说的话本身。"
    try:
        text = (await get_provider().generate(system, prompt)).strip()
        return text or _COMPANION_FALLBACK
    except Exception:
        return _COMPANION_FALLBACK
