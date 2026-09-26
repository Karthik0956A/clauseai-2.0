"""ClauseAI HTTP API."""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import chat, comparison, compliance, documents, risk
from app.config import get_settings
from app.errors import AppError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clauseai")

app = FastAPI(title="ClauseAI API", version="2.0.0")


@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError):
    logger.error("%s %s failed: %s", request.method, request.url.path, exc.message)
    return JSONResponse(status_code=exc.status_code, content={"error": exc.message, "success": False})


@app.get("/health")
def health():
    settings = get_settings()
    return {
        "ok": True,
        "openrouterConfigured": bool(settings.openrouter_api_key and settings.openrouter_model),
        "embeddingsConfigured": bool(settings.embedding_model and settings.openrouter_api_key),
        "qdrantConfigured": bool(settings.qdrant_url),
        "mongoConfigured": bool(settings.mongodb_uri),
    }


app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(comparison.router)
app.include_router(risk.router)
app.include_router(compliance.router)
