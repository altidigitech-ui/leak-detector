"""
API v1 Router - Aggregates all endpoint routers.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import admin, analyses, reports, billing, webhooks

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(
    analyses.router,
    prefix="/analyses",
    tags=["Analyses"],
)

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["Reports"],
)

api_router.include_router(
    billing.router,
    prefix="/billing",
    tags=["Billing"],
)

api_router.include_router(
    webhooks.router,
    prefix="/webhooks",
    tags=["Webhooks"],
)

api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin"],
)
