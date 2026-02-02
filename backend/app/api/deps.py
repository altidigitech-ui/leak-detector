"""
Shared FastAPI dependencies.
"""

from typing import Annotated

from fastapi import Depends

from app.core.security import get_current_user_id, get_optional_user_id
from app.services.supabase import SupabaseService, get_supabase_service


# Type aliases for cleaner dependency injection
CurrentUserID = Annotated[str, Depends(get_current_user_id)]
OptionalUserID = Annotated[str | None, Depends(get_optional_user_id)]
Supabase = Annotated[SupabaseService, Depends(get_supabase_service)]
