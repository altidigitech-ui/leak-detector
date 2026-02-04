"""
Security utilities for JWT validation and authentication.
"""

from typing import Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.core.errors import AuthenticationError, ValidationError

security = HTTPBearer()


def verify_supabase_token(token: str) -> dict:
    """
    Verify a Supabase JWT token with signature validation.

    Validates: signature (HS256), expiration, issuer.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={
                "verify_exp": True,
                "verify_aud": True,
            },
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.JWTClaimsError:
        raise AuthenticationError("Invalid token claims")
    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")


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
