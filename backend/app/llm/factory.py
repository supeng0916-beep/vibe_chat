from app.config import get_settings
from app.llm.anthropic_provider import AnthropicProvider
from app.llm.base import LLMProvider
from app.llm.openai_provider import OpenAIProvider


def get_provider() -> LLMProvider:
    provider = get_settings().llm_provider.lower()
    if provider == "anthropic":
        return AnthropicProvider()
    return OpenAIProvider()
