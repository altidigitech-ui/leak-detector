"""
Common Pydantic schemas used across the application.
"""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class ErrorDetail(BaseModel):
    """Error detail structure."""
    code: str
    message: str
    details: Dict[str, Any] = {}


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    error: ErrorDetail


class SuccessResponse(BaseModel, Generic[T]):
    """Standard success response."""
    success: bool = True
    data: T


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response with metadata."""
    success: bool = True
    data: List[T]
    meta: Dict[str, Any]


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    limit: int
    offset: int
    total: int
    
    @property
    def has_more(self) -> bool:
        return self.offset + self.limit < self.total


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    service: str = "leak-detector-api"
