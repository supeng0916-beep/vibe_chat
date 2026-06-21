from abc import ABC, abstractmethod

from app.schemas import EmotionResult


class LLMProvider(ABC):
    """Common interface for emotion analysis + free-form generation.

    Both OpenAI-standard and Anthropic-standard providers implement this so the
    rest of the app never depends on which vendor is active.
    """

    @abstractmethod
    async def analyze_emotion(self, text: str) -> EmotionResult:
        raise NotImplementedError

    @abstractmethod
    async def generate(self, system: str, prompt: str) -> str:
        """Free-form text completion used for icebreakers and the AI companion."""
        raise NotImplementedError
