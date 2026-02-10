"""
Billing endpoints - Stripe checkout and subscription management.
"""

import asyncio
from typing import Optional

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
    """Checkout session response — either a redirect URL or an inline upgrade confirmation."""
    success: bool = True
    url: Optional[str] = None
    upgraded: Optional[bool] = None
    plan: Optional[str] = None
    message: Optional[str] = None


class PortalResponse(BaseModel):
    """Customer portal response."""
    success: bool = True
    url: str


class BillingStatusResponse(BaseModel):
    """Current billing status."""
    success: bool = True
    data: dict


# Map friendly price IDs to Stripe price IDs and plan names
PRICE_MAP = {
    "price_pro_monthly": {
        "stripe_price": lambda: settings.STRIPE_PRICE_PRO_MONTHLY,
        "plan": "pro",
    },
    "price_agency_monthly": {
        "stripe_price": lambda: settings.STRIPE_PRICE_AGENCY_MONTHLY,
        "plan": "agency",
    },
}


def _get_limit_for_plan(plan: str) -> int:
    """Get analysis limit for a plan."""
    limits = {
        "free": settings.QUOTA_FREE,
        "pro": settings.QUOTA_PRO,
        "agency": settings.QUOTA_AGENCY,
    }
    return limits.get(plan, settings.QUOTA_FREE)


@router.post("/checkout", response_model=CheckoutResponse)
@limiter.limit("5/minute")
async def create_checkout_session(
    request: Request,
    body: CheckoutRequest,
    user_id: CurrentUserID,
    supabase: Supabase,
):
    """
    Create a Stripe Checkout session for subscription, or modify the
    existing subscription inline if the user already has one.

    Returns either:
    - {success: true, url: "https://checkout.stripe.com/..."} for new subscriptions
    - {success: true, upgraded: true, plan: "agency", message: "..."} for inline upgrades
    """
    logger.info("checkout_requested", user_id=user_id, price_id=body.price_id)

    # Get user profile
    profile = await supabase.get_profile(user_id)
    if not profile:
        raise NotFoundError("Profile")

    # Resolve Stripe price ID
    price_config = PRICE_MAP.get(body.price_id)
    if not price_config:
        raise StripeError("Invalid price ID")
    stripe_price_id = price_config["stripe_price"]()
    target_plan = price_config["plan"]

    try:
        # Get or create Stripe customer
        customer_id = profile.get("stripe_customer_id")

        if not customer_id:
            # Create new Stripe customer
            customer = await asyncio.to_thread(
                stripe.Customer.create,
                email=profile["email"],
                metadata={"user_id": user_id},
            )
            customer_id = customer.id

            # Save customer ID to profile
            await supabase.update_profile(user_id, {
                "stripe_customer_id": customer_id,
            })

        # BUG 2 FIX: Check for existing active subscription before creating a checkout
        active_sub = await supabase.get_active_subscription(user_id)

        if active_sub and active_sub.get("stripe_subscription_id"):
            # User already has an active subscription — modify it inline
            # instead of creating a new checkout session (which would cause
            # a duplicate subscription).
            subscription_id = active_sub["stripe_subscription_id"]

            logger.info(
                "inline_upgrade_started",
                user_id=user_id,
                subscription_id=subscription_id,
                target_plan=target_plan,
            )

            # Retrieve the current subscription to get the item ID
            current_sub = await asyncio.to_thread(
                stripe.Subscription.retrieve,
                subscription_id,
            )

            if not current_sub or current_sub.get("status") not in ("active", "trialing"):
                # Subscription isn't actually active in Stripe — fall through to checkout
                logger.warning(
                    "inline_upgrade_sub_not_active",
                    user_id=user_id,
                    subscription_id=subscription_id,
                    stripe_status=current_sub.get("status") if current_sub else None,
                )
            else:
                # Modify the subscription: swap the price on the existing item
                item_id = current_sub["items"]["data"][0]["id"]

                updated_sub = await asyncio.to_thread(
                    stripe.Subscription.modify,
                    subscription_id,
                    items=[{
                        "id": item_id,
                        "price": stripe_price_id,
                    }],
                    proration_behavior="create_prorations",
                )

                logger.info(
                    "inline_upgrade_completed",
                    user_id=user_id,
                    subscription_id=subscription_id,
                    new_plan=target_plan,
                    new_status=updated_sub["status"],
                )

                # Update local profile immediately (webhook will also fire,
                # but we update now for faster UX)
                new_limit = _get_limit_for_plan(target_plan)
                await supabase.update_profile(user_id, {
                    "plan": target_plan,
                    "analyses_limit": new_limit,
                    "analyses_used": 0,
                })

                return CheckoutResponse(
                    upgraded=True,
                    plan=target_plan,
                    message=f"Plan upgraded to {target_plan.capitalize()}",
                )

        # No active subscription — create a new checkout session (free → paid)
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            customer=customer_id,
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price": stripe_price_id,
                "quantity": 1,
            }],
            success_url=f"{settings.FRONTEND_URL}/billing?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/billing?canceled=true",
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
        # Create Stripe customer for users without one (e.g., manually upgraded)
        try:
            customer = await asyncio.to_thread(
                stripe.Customer.create,
                email=profile["email"],
                metadata={"user_id": user_id},
            )
            customer_id = customer.id

            # Save to profile
            await supabase.update_profile(user_id, {
                "stripe_customer_id": customer_id,
            })
            logger.info("stripe_customer_created", user_id=user_id, customer_id=customer_id)
        except stripe.error.StripeError as e:
            logger.error("stripe_customer_creation_failed", error=str(e))
            raise StripeError("Could not create billing account")

    try:
        session = await asyncio.to_thread(
            stripe.billing_portal.Session.create,
            customer=customer_id,
            return_url=f"{settings.FRONTEND_URL}/billing",
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
