import json

from openai import AsyncOpenAI

from app.config import get_settings
from app.llm.base import LLMProvider
from app.llm.prompts import EMOTION_SYSTEM
from app.schemas import EmotionResult


class OpenAIProvider(LLMProvider):
    """OpenAI-standard provider. Works with the official API or any
    OpenAI-compatible gateway via OPENAI_BASE_URL.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.model = settings.openai_model
        self.client = AsyncOpenAI(
            api_key=settings.openai_api_key or "sk-noop",
            base_url=settings.openai_base_url,
        )

    async def analyze_emotion(self, text: str) -> EmotionResult:
        # json_object mode is far more widely supported across gateways than
        # strict json_schema, so we steer the structure via the system prompt.
        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": EMOTION_SYSTEM},
                {"role": "user", "content": text},
            ],
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(_extract_json(content))
        data.setdefault("degraded", False)
        return EmotionResult.model_validate(data)

    async def generate(self, system: str, prompt: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            temperature=0.8,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()


def _extract_json(content: str) -> str:
    """Tolerate models that wrap JSON in ```json fences or prose."""
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
    start, end = content.find("{"), content.rfind("}")
    if start != -1 and end != -1:
        return content[start : end + 1]
    return content
