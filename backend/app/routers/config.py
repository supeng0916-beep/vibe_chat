from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(prefix="/api", tags=["config"])


@router.get("/config")
def config() -> dict:
    settings = get_settings()
    model = settings.anthropic_model if settings.llm_provider == "anthropic" else settings.openai_model
    return {"provider": settings.llm_provider, "model": model}


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}
