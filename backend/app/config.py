from functools import lru_cache
import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env from the project root regardless of the process CWD
# (uvicorn, gunicorn, Render all start from different places).
_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"

# A dev machine running Claude Code exports ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN
# for its own proxy gateway. Both pydantic-settings and the anthropic SDK read OS env
# vars first, which would hijack this app's configured Anthropic endpoint. When a
# project .env exists, make it authoritative by dropping those ambient vars.
# (On Render there is no .env, so platform env vars still apply.)
if _ROOT_ENV.exists():
    for _k in ("ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"):
        os.environ.pop(_k, None)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ROOT_ENV), env_file_encoding="utf-8", extra="ignore")

    llm_provider: str = Field(default="openai", alias="LLM_PROVIDER")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    anthropic_base_url: str = Field(default="https://api.anthropic.com", alias="ANTHROPIC_BASE_URL")
    anthropic_model: str = Field(default="claude-haiku-4-5-20251001", alias="ANTHROPIC_MODEL")
    frontend_origin: str = Field(default="http://localhost:3000", alias="FRONTEND_ORIGIN")
    database_url: str = Field(default="sqlite:///./vibechat.db", alias="DATABASE_URL")
    match_timeout_seconds: int = Field(default=15, alias="MATCH_TIMEOUT_SECONDS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
