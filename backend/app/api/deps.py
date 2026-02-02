"""
FastAPI Dependencies for injection.
"""
from typing import Annotated, Optional

from fastapi import Depends, Query

from app.core.security import get_current_user, get_current_user_optional, require_admin


# Type aliases for cleaner endpoint signatures
CurrentUser = Annotated[dict, Depends(get_current_user)]
CurrentUserOptional = Annotated[Optional[dict], Depends(get_current_user_optional)]
AdminUser = Annotated[dict, Depends(require_admin)]


class PaginationParams:
    """
    Common pagination parameters.
    
    Usage:
        @router.get("/items")
        async def list_items(pagination: PaginationParams = Depends()):
            ...
    """
    
    def __init__(
        self,
        page: Annotated[int, Query(ge=1, description="Page number")] = 1,
        limit: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    ):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit


class SortParams:
    """
    Common sorting parameters.
    
    Usage:
        @router.get("/items")
        async def list_items(sort: SortParams = Depends()):
            ...
    """
    
    def __init__(
        self,
        sort: Annotated[
            str,
            Query(description="Sort field. Prefix with '-' for descending.")
        ] = "-created_at",
    ):
        self.field = sort.lstrip("-")
        self.descending = sort.startswith("-")
        self.order = "desc" if self.descending else "asc"
