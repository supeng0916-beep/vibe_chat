from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.routers import chat, config, emotion, match, session


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="VibeChat API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin],
        # Allow localhost (any port) + any *.vercel.app deployment (prod & preview),
        # so the frontend works regardless of which Vercel URL serves it.
        allow_origin_regex=r"(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://[a-z0-9-]+\.vercel\.app)",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(config.router)
    app.include_router(session.router)
    app.include_router(emotion.router)
    app.include_router(match.router)
    app.include_router(chat.router)

    return app


app = create_app()
