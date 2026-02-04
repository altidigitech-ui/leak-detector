"""
Billing endpoints - Stripe checkout and subscription management.
"""

import stripe
from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.api.deps import CurrentUserID, Supabase
from app.config import settings
from app.core.errors import NotFoundError, StripeError
from app.core.limiter import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


# Request/Response schemas
class CheckoutRequest(BaseModel):
    """Request to create a checkout session."""
    price_id: str  # 'price_pro_monthly' or 'price_agency_monthly'


class CheckoutResponse(BaseModel):
    """Checkout session response."""
    success: bool = True
    url: str


class PortalResponse(BaseModel):
    """Customer portal response."""
    success: bool = True
    url: str


class BillingStatusResponse(BaseModel):
    """Current billing status."""
    success: bool = True
    data: dict


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("5/minute")
async def create_checkout_session(
    request: Request,
    body: CheckoutRequest,
    user_id: CurrentUserID,
    supabase: Supabase,
):
    """
    Create a Stripe Checkout session for subscription.

    Returns a URL to redirect the user to Stripe Checkout.
    """
    logger.info("checkout_requested", user_id=user_id, price_id=body.price_id)

    # Get user profile
    profile = await supabase.get_profile(user_id)
    if not profile:
        raise NotFoundError("Profile")

    # Map price_id to actual Stripe price
    price_map = {
        "price_pro_monthly": settings.STRIPE_PRICE_PRO_MONTHLY,
        "price_agency_monthly": settings.STRIPE_PRICE_AGENCY_MONTHLY,
    }

    stripe_price_id = price_map.get(body.price_id)
    if not stripe_price_id:
        raise StripeError("Invalid price ID")
    
    try:
        # Get or create Stripe customer
        customer_id = profile.get("stripe_customer_id")
        
        if not customer_id:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=profile["email"],
                metadata={"user_id": user_id},
            )
            customer_id = customer.id
            
            # Save customer ID to profile
            await supabase.update_profile(user_id, {
                "stripe_customer_id": customer_id,
            })
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price": stripe_price_id,
                "quantity": 1,
            }],
            success_url=f"{settings.FRONTEND_URL}/settings?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/pricing?canceled=true",
            metadata={
                "user_id": user_id,
            },
        )
        
        logger.info("checkout_session_created", user_id=user_id, session_id=session.id)
        
        return CheckoutResponse(url=session.url)
        
    except stripe.error.StripeError as e:
        logger.error("stripe_error", error=str(e), user_id=user_id)
        raise StripeError(f"Payment error: {str(e)}")


@router.post("/portal", response_model=PortalResponse)
@limiter.limit("5/minute")
async def create_portal_session(
    request: Request,
    user_id: CurrentUserID,
    supabase: Supabase,
):
    """
    Create a Stripe Customer Portal session.

    Allows users to manage their subscription, update payment method, etc.
    """
    logger.info("portal_requested", user_id=user_id)

    # Get user profile
    profile = await supabase.get_profile(user_id)
    if not profile:
        raise NotFoundError("Profile")
    
    customer_id = profile.get("stripe_customer_id")
    if not customer_id:
        raise StripeError("No active subscription found")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.FRONTEND_URL}/settings",
        )
        
        logger.info("portal_session_created", user_id=user_id)
        
        return PortalResponse(url=session.url)
        
    except stripe.error.StripeError as e:
        logger.error("stripe_error", error=str(e), user_id=user_id)
        raise StripeError(f"Portal error: {str(e)}")


@router.get("/status", response_model=BillingStatusResponse)
async def get_billing_status(
    user_id: CurrentUserID,
    supabase: Supabase,
):
    """
    Get current billing status and usage.
    """
    # Get user profile
    profile = await supabase.get_profile(user_id)
    if not profile:
        raise NotFoundError("Profile")

    # Get active subscription if any
    subscription = await supabase.get_active_subscription(user_id)
    
    return BillingStatusResponse(
        data={
            "plan": profile["plan"],
            "analyses_used": profile["analyses_used"],
            "analyses_limit": profile["analyses_limit"],
            "analyses_reset_at": profile["analyses_reset_at"],
            "stripe_customer_id": profile.get("stripe_customer_id"),
            "subscription": {
                "status": subscription["status"],
                "current_period_end": subscription["current_period_end"],
            } if subscription else None,
        }
    )
