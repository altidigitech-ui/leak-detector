"""
Security utilities for JWT validation and authentication.

Uses direct HTTP calls to Supabase GoTrue API to verify tokens.
This avoids supabase SDK version conflicts and HS256/ES256 algorithm issues.
"""

from typing import Optional

import httpx
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.core.errors import AuthenticationError, ValidationError

security = HTTPBearer()

# Supabase GoTrue endpoint
_AUTH_URL = f"{settings.SUPABASE_URL}/auth/v1/user"


def verify_supabase_token(token: str) -> dict:
    """
    Verify a Supabase JWT token by calling Supabase's GoTrue API.

    Sends the token to Supabase server which handles all verification
    (signature, expiration, algorithm) regardless of HS256 or ES256.
    """
    try:
        response = httpx.get(
            _AUTH_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.SUPABASE_SERVICE_KEY,
            },
            timeout=10.0,
        )

        if response.status_code == 401:
            raise AuthenticationError("Invalid or expired token")

        if response.status_code != 200:
            raise AuthenticationError(f"Token verification failed (HTTP {response.status_code})")

        user_data = response.json()
        user_id = user_data.get("id")

        if not user_id:
            raise AuthenticationError("Token missing user ID")

        return {
            "sub": user_id,
            "email": user_data.get("email"),
            "aud": "authenticated",
            "role": user_data.get("role"),
        }
    except AuthenticationError:
        raise
    except httpx.TimeoutException:
        raise AuthenticationError("Token verification timed out")
    except Exception as e:
        raise AuthenticationError(f"Token verification failed: {str(e)}")


def get_user_id_from_token(token: str) -> str:
    """
    Extract user ID from a Supabase JWT token.
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
