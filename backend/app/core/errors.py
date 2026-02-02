"""
Custom exceptions and error handlers.
"""
from enum import Enum
from typing import Any, Dict, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import structlog

logger = structlog.get_logger()


class ErrorCode(str, Enum):
    """Enumeration of all error codes."""
    
    # Auth errors
    AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID"
    AUTH_FORBIDDEN = "AUTH_FORBIDDEN"
    AUTH_EMAIL_EXISTS = "AUTH_EMAIL_EXISTS"
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    VALIDATION_REQUIRED = "VALIDATION_REQUIRED"
    VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT"
    
    # Resource errors
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_LOCKED = "RESOURCE_LOCKED"
    
    # Payment errors
    PAYMENT_CARD_DECLINED = "PAYMENT_CARD_DECLINED"
    PAYMENT_PROCESSING_ERROR = "PAYMENT_PROCESSING_ERROR"
    
    # Quota errors
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    QUOTA_RATE_LIMITED = "QUOTA_RATE_LIMITED"
    
    # External errors
    EXTERNAL_SERVICE_UNAVAILABLE = "EXTERNAL_SERVICE_UNAVAILABLE"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    
    # System errors
    SYSTEM_INTERNAL_ERROR = "SYSTEM_INTERNAL_ERROR"
    SYSTEM_DATABASE_ERROR = "SYSTEM_DATABASE_ERROR"


class ErrorDetail(BaseModel):
    """Error detail model."""
    
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response model."""
    
    success: bool = False
    error: ErrorDetail


class AppException(Exception):
    """
    Base application exception.
    
    Usage:
        raise AppException(
            code=ErrorCode.RESOURCE_NOT_FOUND,
            message="Report not found",
            status_code=404,
            details={"report_id": "123"}
        )
    """
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)
    
    def to_response(self) -> ErrorResponse:
        """Convert to ErrorResponse model."""
        return ErrorResponse(
            success=False,
            error=ErrorDetail(
                code=self.code.value,
                message=self.message,
                details=self.details,
            )
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle AppException."""
    logger.warning(
        "app_exception",
        code=exc.code.value,
        message=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_response().model_dump(),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    errors = exc.errors()
    
    # Format validation errors
    formatted_errors = []
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        formatted_errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"],
        })
    
    logger.info(
        "validation_error",
        errors=formatted_errors,
        path=request.url.path,
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": ErrorCode.VALIDATION_ERROR.value,
                "message": "Validation error",
                "details": {"errors": formatted_errors},
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.exception(
        "unhandled_exception",
        error=str(exc),
        path=request.url.path,
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": ErrorCode.SYSTEM_INTERNAL_ERROR.value,
                "message": "An unexpected error occurred. Our team has been notified.",
            }
        },
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """Register exception handlers on the FastAPI app."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
