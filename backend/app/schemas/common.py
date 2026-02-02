"""
Common Pydantic schemas used across the application.
"""
from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

DataT = TypeVar('DataT')


class ErrorDetail(BaseModel):
    """Error detail in API response."""
    
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict[str, Any]] = Field(None, description="Additional error details")


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    
    page: int = Field(..., ge=1, description="Current page number")
    limit: int = Field(..., ge=1, le=100, description="Items per page")
    total: int = Field(..., ge=0, description="Total number of items")
    total_pages: int = Field(..., ge=0, description="Total number of pages")


class SuccessResponse(BaseModel, Generic[DataT]):
    """Standard success response wrapper."""
    
    success: bool = True
    data: DataT
    meta: Optional[PaginationMeta] = None


class ErrorResponse(BaseModel):
    """Standard error response wrapper."""
    
    success: bool = False
    error: ErrorDetail


class MessageResponse(BaseModel):
    """Simple message response."""
    
    success: bool = True
    message: str


# Common field validators and constraints
class Constraints:
    """Common field constraints."""
    
    # String lengths
    EMAIL_MAX = 255
    NAME_MAX = 255
    URL_MAX = 2048
    DESCRIPTION_MAX = 5000
    
    # Pagination
    PAGE_MIN = 1
    LIMIT_MIN = 1
    LIMIT_MAX = 100
    LIMIT_DEFAULT = 20


# Re-usable field definitions
def email_field(**kwargs):
    """Email field with validation."""
    return Field(
        ...,
        max_length=Constraints.EMAIL_MAX,
        pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
        **kwargs
    )


def url_field(**kwargs):
    """URL field with validation."""
    return Field(
        ...,
        max_length=Constraints.URL_MAX,
        pattern=r'^https?://.+',
        **kwargs
    )
