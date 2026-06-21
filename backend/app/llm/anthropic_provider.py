import json

from anthropic import AsyncAnthropic

from app.config import get_settings
from app.llm.base import LLMProvider
from app.llm.prompts import EMOTION_SYSTEM
from app.schemas import EmotionResult

# Emotion tool schema for forced structured output (no internal-only fields).
EMOTION_TOOL_SCHEMA = {
    "type": "object",
    "properties": {
        "reasoning": {"type": "string"},
        "primary_emotion": {"type": "string"},
        "secondary_emotions": {"type": "array", "items": {"type": "string"}},
        "valence": {"type": "number"},
        "arousal": {"type": "number"},
        "intensity": {"type": "number"},
        "polarity": {"type": "string", "enum": ["positive", "negative", "neutral"]},
        "keywords": {"type": "array", "items": {"type": "string"}},
        "color": {"type": "string"},
        "emotion_emoji": {"type": "string"},
        "explanation": {"type": "string"},
        "safety_flag": {"type": "boolean"},
    },
    "required": [
        "reasoning", "primary_emotion", "valence", "arousal", "intensity",
        "polarity", "keywords", "color", "emotion_emoji", "explanation", "safety_flag",
    ],
}


class AnthropicProvider(LLMProvider):
    """Anthropic-standard provider. Works with the official API or an
    Anthropic-compatible gateway via ANTHROPIC_BASE_URL.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.anthropic_model
        self.client = AsyncAnthropic(
            api_key=settings.anthropic_api_key or "sk-noop",
            base_url=settings.anthropic_base_url,
        )

    async def analyze_emotion(self, text: str) -> EmotionResult:
        tool = {
            "name": "emit_emotion_result",
            "description": "Return structured emotion analysis for VibeChat.",
            "input_schema": EMOTION_TOOL_SCHEMA,
        }
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1200,
            temperature=0,
            tools=[tool],
            tool_choice={"type": "tool", "name": "emit_emotion_result"},
            system=EMOTION_SYSTEM,
            messages=[{"role": "user", "content": text}],
        )
        for block in response.content:
            if block.type == "tool_use":
                data = json.loads(json.dumps(block.input))
                data.setdefault("secondary_emotions", [])
                data.setdefault("degraded", False)
                return EmotionResult.model_validate(data)
        raise ValueError("Anthropic response did not include emotion tool output")

    async def generate(self, system: str, prompt: str) -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=400,
            temperature=0.8,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        parts = [block.text for block in response.content if block.type == "text"]
        return "".join(parts).strip()
