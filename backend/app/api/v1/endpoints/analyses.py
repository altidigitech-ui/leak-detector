"""
Analyses endpoints - Create and manage landing page analyses.

NOTE: Run this SQL in Supabase to reset test quota:
UPDATE profiles SET analyses_used = 0 WHERE id = '99d17cc8-c5fa-416c-8af3-52d55ab24324';
"""

import ipaddress
import socket
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Request, status
from pydantic import BaseModel, Field, field_validator

from app.api.deps import CurrentUserID, Supabase
from app.core.limiter import limiter
from app.core.errors import QuotaExceededError, NotFoundError
from app.core.logging import get_logger
from app.workers.tasks.analyze import analyze_page_task

logger = get_logger(__name__)

router = APIRouter()


# Request/Response schemas
class CreateAnalysisRequest(BaseModel):
    """Request to create a new analysis."""
    url: str = Field(..., description="URL of the landing page to analyze")
    
    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format with SSRF prevention."""
        v = v.strip()

        # Max URL length (prevent DoS)
        if len(v) > 2048:
            raise ValueError("URL too long (max 2048 characters)")

        # Add https if missing
        if not v.startswith(("http://", "https://")):
            v = f"https://{v}"

        # Parse and validate
        try:
            parsed = urlparse(v)
            if not parsed.netloc:
                raise ValueError("Invalid URL")
        except Exception:
            raise ValueError("Invalid URL format")

        # Block non-http(s) schemes (SSRF prevention)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Only HTTP and HTTPS URLs are allowed")

        # Block private/internal IPs (SSRF prevention)
        hostname = parsed.hostname
        if hostname:
            # Block localhost variations
            if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
                raise ValueError("Internal URLs are not allowed")

            # Resolve hostname and check for private IPs
            try:
                ip = socket.gethostbyname(hostname)
                ip_obj = ipaddress.ip_address(ip)
                if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved:
                    raise ValueError("Internal URLs are not allowed")
            except socket.gaierror:
                raise ValueError("Could not resolve hostname")

        return v


class AnalysisResponse(BaseModel):
    """Analysis response."""
    id: str
    url: str
    status: str
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class AnalysisListResponse(BaseModel):
    """List of analyses response."""
    success: bool = True
    data: List[AnalysisResponse]
    meta: dict


class SingleAnalysisResponse(BaseModel):
    """Single analysis response."""
    success: bool = True
    data: AnalysisResponse


@router.post("", response_model=SingleAnalysisResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_analysis(
    request: Request,
    body: CreateAnalysisRequest,
    user_id: CurrentUserID,
    supabase: Supabase,
):
    """
    Create a new landing page analysis.

    This will:
    1. Check user's quota
    2. Create an analysis record
    3. Queue the analysis task
    4. Return the analysis ID for polling
    """
    logger.info("analysis_create_requested", user_id=user_id, url_domain=urlparse(body.url).netloc)

    # Get user profile and check quota
    profile = await supabase.get_profile(user_id)
    if not profile:
        raise NotFoundError("Profile")
    
    # Check quota
    if profile["analyses_used"] >= profile["analyses_limit"]:
        raise QuotaExceededError(
            limit=profile["analyses_limit"],
            plan=profile["plan"],
        )
    
    # Create analysis record
    analysis = await supabase.create_analysis(
        user_id=user_id,
        url=body.url,
    )

    # NOTE: Quota is incremented in the worker ONLY on successful analysis
    # This prevents wasting credits on failed scraping/analysis attempts

    # Queue the analysis task (graceful if worker not available)
    try:
        analyze_page_task.delay(analysis["id"])
    except Exception as e:
        logger.warning("celery_dispatch_failed", analysis_id=analysis["id"], error=str(e))
    
    logger.info("analysis_created", analysis_id=analysis["id"], user_id=user_id)
    
    return SingleAnalysisResponse(
        data=AnalysisResponse(
            id=analysis["id"],
            url=analysis["url"],
            status=analysis["status"],
            created_at=analysis["created_at"],
        )
    )


@router.get("", response_model=AnalysisListResponse)
async def list_analyses(
    user_id: CurrentUserID,
    supabase: Supabase,
    limit: int = 20,
    offset: int = 0,
):
    """
    List user's analyses with pagination.
    """
    analyses, total = await supabase.list_analyses(
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    
    return AnalysisListResponse(
        data=[
            AnalysisResponse(
                id=a["id"],
                url=a["url"],
                status=a["status"],
                error_code=a.get("error_code"),
                error_message=a.get("error_message"),
                created_at=a["created_at"],
                started_at=a.get("started_at"),
                completed_at=a.get("completed_at"),
            )
            for a in analyses
        ],
        meta={
            "limit": limit,
            "offset": offset,
            "total": total,
        }
    )


@router.get("/{analysis_id}", response_model=SingleAnalysisResponse)
async def get_analysis(
    analysis_id: str,
    user_id: CurrentUserID,
    supabase: Supabase,
):
    """
    Get a specific analysis by ID.
    
    Use this to poll for analysis status.
    """
    analysis = await supabase.get_analysis(analysis_id, user_id)
    
    if not analysis:
        raise NotFoundError("Analysis")
    
    return SingleAnalysisResponse(
        data=AnalysisResponse(
            id=analysis["id"],
            url=analysis["url"],
            status=analysis["status"],
            error_code=analysis.get("error_code"),
            error_message=analysis.get("error_message"),
            created_at=analysis["created_at"],
            started_at=analysis.get("started_at"),
            completed_at=analysis.get("completed_at"),
        )
    )
