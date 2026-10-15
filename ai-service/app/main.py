"""
EcoNexus AI — The Intelligent Sustainable Campus Microservice.
FastAPI Application Entry Point.
"""

import time
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import config
from app.vision.model_loader import model_loader
from app.api.router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("econexus.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager: loads neural weights once at startup."""
    logger.info("Initializing EcoNexus AI Intelligence Service...")
    start_init = time.perf_counter()
    
    # 1. Preload computer vision model once
    model_loader.load_model()
    
    elapsed = round((time.perf_counter() - start_init) * 1000, 2)
    logger.info(
        f"EcoNexus AI ready in {elapsed}ms | Port: {config.port} | "
        f"Vision Model: {model_loader.model_name} (v{model_loader.model_version}) | "
        f"LLM Provider: {config.llm.provider}"
    )
    yield
    logger.info("EcoNexus AI Service shutting down gracefully...")


app = FastAPI(
    title="EcoNexus AI — Sustainable Campus Intelligence Engine",
    description=(
        "Production-grade AI backend featuring Computer Vision diagnostics, "
        "explainable sensor anomaly analytics, grounded Generative AI reasoning, "
        "and environmental impact calculations."
    ),
    version=config.version,
    lifespan=lifespan
)

# Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Request Timing and Logging Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(process_time)
    response.headers["X-AI-Engine-Version"] = config.version
    return response


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal AI Service Error",
            "message": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


# Health Check Endpoints
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check():
    meta = model_loader.get_metadata()
    return {
        "status": "online",
        "service": config.service_name,
        "version": config.version,
        "model_version": meta["model_version"],
        "framework": meta["framework"],
        "device": meta["device"],
        "llm_provider": config.llm.provider,
        "capabilities": [
            "computer_vision_diagnostics",
            "explainable_sensor_anomalies",
            "telemetry_data_cleaning",
            "grounded_genai_advisory",
            "ecoimpact_intelligence_workflow",
            "resource_impact_estimation",
            "predictive_forecasting"
        ],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# Mount consolidated API routes
app.include_router(api_router)
