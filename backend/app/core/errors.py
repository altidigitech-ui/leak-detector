"""
Custom exceptions and error handling.
"""

from typing import Any, Dict, Optional

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application error."""
    
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


# Specific errors
class ValidationError(AppError):
    """Input validation error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=400,
            details=details,
        )


class AuthenticationError(AppError):
    """Authentication failed."""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            code="AUTHENTICATION_ERROR",
            message=message,
            status_code=401,
        )


class AuthorizationError(AppError):
    """User not authorized for this action."""
    
    def __init__(self, message: str = "Not authorized"):
        super().__init__(
            code="AUTHORIZATION_ERROR",
            message=message,
            status_code=403,
        )


class NotFoundError(AppError):
    """Resource not found."""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            code="NOT_FOUND",
            message=f"{resource} not found",
            status_code=404,
        )


class QuotaExceededError(AppError):
    """User has exceeded their quota."""
    
    def __init__(self, limit: int, plan: str):
        super().__init__(
            code="QUOTA_EXCEEDED",
            message=f"Monthly analysis limit reached ({limit} analyses)",
            status_code=403,
            details={"limit": limit, "plan": plan},
        )


class ScrapingError(AppError):
    """Error during page scraping."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="SCRAPING_ERROR",
            message=message,
            status_code=400,
            details=details,
        )


class AnalysisError(AppError):
    """Error during analysis."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="ANALYSIS_ERROR",
            message=message,
            status_code=500,
            details=details,
        )


class RateLimitError(AppError):
    """Too many requests."""
    
    def __init__(self, retry_after: int = 60):
        super().__init__(
            code="RATE_LIMITED",
            message="Too many requests. Please try again later.",
            status_code=429,
            details={"retry_after": retry_after},
        )


class StripeError(AppError):
    """Stripe payment error."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code="PAYMENT_ERROR",
            message=message,
            status_code=400,
            details=details,
        )


# Exception handlers
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Handle AppError exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTPExceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
                "details": {},
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    import traceback
    logger = __import__("app.core.logging", fromlist=["get_logger"]).get_logger(__name__)
    logger.error("unhandled_exception", error=str(exc), traceback=traceback.format_exc(), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": {},
            }
        },
    )
