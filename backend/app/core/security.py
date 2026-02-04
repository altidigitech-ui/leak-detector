"""
Security utilities for JWT validation and authentication.
"""

from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

from app.config import settings
from app.core.errors import AuthenticationError, ValidationError

security = HTTPBearer()

# Initialize Supabase client once at module level
_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)


def verify_supabase_token(token: str) -> dict:
    """
    Verify a Supabase JWT token using Supabase's auth API.

    Uses supabase.auth.get_user() which handles ES256/HS256
    verification server-side — no algorithm mismatch issues.
    """
    try:
        response = _supabase.auth.get_user(token)

        if not response or not response.user:
            raise AuthenticationError("Invalid token")

        user = response.user
        return {
            "sub": user.id,
            "email": user.email,
            "aud": "authenticated",
            "role": user.role,
        }
    except AuthenticationError:
        raise
    except Exception as e:
        error_msg = str(e).lower()
        if "expired" in error_msg:
            raise AuthenticationError("Token has expired")
        if "invalid" in error_msg or "unauthorized" in error_msg:
            raise AuthenticationError("Invalid token")
        raise AuthenticationError(f"Token verification failed: {str(e)}")


def get_user_id_from_token(token: str) -> str:
    """
    Extract user ID from a Supabase JWT token.

    Args:
        token: The JWT token

    Returns:
        The user ID (sub claim)
    """
    payload = verify_supabase_token(token)
    user_id = payload.get("sub")

    if not user_id:
        raise AuthenticationError("Token missing user ID")

    return user_id


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    FastAPI dependency to get the current authenticated user ID.

    Args:
        credentials: The HTTP Bearer credentials

    Returns:
        The authenticated user's ID
    """
    token = credentials.credentials
    return get_user_id_from_token(token)


async def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
) -> Optional[str]:
    """
    FastAPI dependency to optionally get the current user ID.
    Returns None if not authenticated.
    """
    if not credentials:
        return None

    try:
        return get_user_id_from_token(credentials.credentials)
    except AuthenticationError:
        return None


def verify_stripe_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify a Stripe webhook signature.

    Args:
        payload: The raw request body
        signature: The Stripe-Signature header

    Returns:
        True if valid, raises exception otherwise
    """
    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        stripe.Webhook.construct_event(
            payload,
            signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
        return True
    except stripe.error.SignatureVerificationError:
        raise ValidationError("Invalid webhook signature")
