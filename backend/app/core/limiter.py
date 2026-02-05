"""
Rate limiting configuration with user-based key function.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_rate_limit_key(request: Request) -> str:
    """
    Get rate limit key - uses user ID when authenticated, IP when not.

    This ensures authenticated users get per-user limits while
    unauthenticated requests are still IP-limited.
    """
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from app.core.security import get_user_id_from_token
            user_id = get_user_id_from_token(auth[7:])
            return f"user:{user_id}"
        except Exception:
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=get_rate_limit_key, default_limits=["100/minute"])
