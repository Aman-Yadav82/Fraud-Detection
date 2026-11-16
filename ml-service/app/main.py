"""Fraud Detection ML Service — FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.predict import router as predict_router, set_model
from app.config import get_settings

settings = get_settings()

logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: load model on startup, cleanup on shutdown."""
    model_path = Path(settings.model_path)
    if model_path.exists():
        try:
            model = joblib.load(model_path)
            set_model(model)
            logger.info("Model loaded from %s", model_path)
        except Exception:
            logger.exception("Failed to load model from %s", model_path)
    else:
        logger.warning(
            "Model file not found at %s — predictions will use mock mode.",
            model_path,
        )
    yield
    # Shutdown: nothing to clean up for now.
    logger.info("Shutting down Fraud Detection ML Service.")


app = FastAPI(
    title="Fraud Detection ML Service",
    version="1.0.0",
    description="Real-time transaction fraud scoring API powered by ML.",
    lifespan=lifespan,
)

# ── CORS middleware ──────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(predict_router)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    """Return service health status."""
    return {"status": "healthy", "service": "fraud-detection-ml"}
