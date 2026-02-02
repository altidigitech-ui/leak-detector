"""
API v1 Router - Aggregates all endpoint routers.
"""
from fastapi import APIRouter

# Import endpoint routers here
# from app.api.v1.endpoints import profiles, reports, webhooks

api_router = APIRouter()

# Include routers
# api_router.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
# api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
# api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])


@api_router.get("/")
async def root():
    """API root endpoint."""
    return {
        "success": True,
        "data": {
            "message": "API v1",
            "version": "1.0.0",
        }
    }
