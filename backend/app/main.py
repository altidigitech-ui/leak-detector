"""
Leak Detector API - Main Application
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import sentry_sdk
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.v1.router import api_router
from app.core.errors import AppError, app_error_handler, http_exception_handler, generic_exception_handler
from app.core.limiter import limiter
from app.core.logging import setup_logging, get_logger

logger = get_logger(__name__)


def setup_sentry() -> None:
    """Initialize Sentry for error tracking."""
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.APP_ENV,
            traces_sample_rate=0.1,
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
    setup_sentry()
    logger.info("application_started", environment=settings.APP_ENV)
    
    yield
    
    # Shutdown
    logger.info("application_stopped")


app = FastAPI(
    title=settings.APP_NAME,
    description="Analyze landing pages for conversion leaks",
    version="1.0.0",
    docs_url="/docs" if settings.APP_DEBUG else None,
    redoc_url="/redoc" if settings.APP_DEBUG else None,
    lifespan=lifespan,
)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers (added after CORS so headers are applied to CORS responses)
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Exception handlers
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers."""
    health = {"status": "healthy", "service": "leak-detector-api"}

    # Check Redis connectivity
    try:
        from app.workers.celery import celery_app
        conn = celery_app.connection()
        conn.ensure_connection(max_retries=1)
        conn.release()
        health["redis"] = "connected"
    except Exception:
        health["redis"] = "disconnected"
        health["status"] = "degraded"

    return health


# API routes
app.include_router(api_router, prefix="/api/v1")


# Root redirect
@app.get("/", include_in_schema=False)
async def root():
    """Redirect to API docs."""
    return {"message": "Leak Detector API", "docs": "/docs"}
