"""
Consolidated API Router.
Combines Vision, Analytics, Grounded LLM, and Intelligence routes.
"""

from fastapi import APIRouter

from app.api.vision_routes import router as vision_router
from app.api.analytics_routes import router as analytics_router
from app.api.llm_routes import router as llm_router
from app.api.intelligence_routes import router as intelligence_router

api_router = APIRouter()

# Include all sub-routers
api_router.include_router(vision_router)
api_router.include_router(analytics_router)
api_router.include_router(llm_router)
api_router.include_router(intelligence_router)
