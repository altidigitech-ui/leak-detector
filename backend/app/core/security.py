"""
Security utilities and authentication helpers.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.services.supabase import get_supabase_client

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    Validate JWT token and return user data.
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        User data from Supabase Auth
        
    Raises:
        HTTPException: If token is missing, invalid, or expired
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "AUTH_UNAUTHORIZED",
                    "message": "Authentication required",
                }
            },
        )
    
    token = credentials.credentials
    supabase = get_supabase_client()
    
    try:
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "AUTH_TOKEN_INVALID",
                        "message": "Invalid token",
                    }
                },
            )
        
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "role": user_response.user.role,
            "user_metadata": user_response.user.user_metadata,
        }
        
    except Exception as e:
        # Check if it's an expiration error
        error_str = str(e).lower()
        if "expired" in error_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "success": False,
                    "error": {
                        "code": "AUTH_TOKEN_EXPIRED",
                        "message": "Token has expired. Please log in again.",
                    }
                },
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "AUTH_TOKEN_INVALID",
                    "message": "Invalid token",
                }
            },
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """
    Optionally get current user if token is provided.
    Returns None if no token, raises error only if token is invalid.
    """
    if not credentials:
        return None
    
    return await get_current_user(credentials)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency that requires admin role.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User data if admin
        
    Raises:
        HTTPException: If user is not admin
    """
    # Check admin role in user metadata or custom claim
    user_metadata = current_user.get("user_metadata", {})
    is_admin = user_metadata.get("is_admin", False)
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {
                    "code": "AUTH_FORBIDDEN",
                    "message": "Admin access required",
                }
            },
        )
    
    return current_user
