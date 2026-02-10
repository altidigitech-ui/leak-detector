"""
Webhook endpoints - Handle Stripe events.
"""

import asyncio
import traceback
from datetime import datetime

import redis
import stripe
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.errors import ValidationError
from app.services.supabase import get_supabase_service
from app.services.email import send_welcome_email, send_subscription_email, add_contact_to_list
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Redis client for webhook idempotency (module-level singleton to reuse connections)
_redis_client = None

# Events where handler failure should return 500 so Stripe retries
CRITICAL_EVENTS = {
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
}


def get_redis_client():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.

    Events handled:
    - checkout.session.completed: New subscription
    - customer.subscription.updated: Plan change
    - customer.subscription.deleted: Cancellation
    - invoice.payment_failed: Payment failure
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise ValidationError("Missing webhook signature")

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError as e:
        logger.error("webhook_invalid_payload", error=str(e))
        raise ValidationError("Invalid webhook payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error("webhook_invalid_signature", error=str(e))
        raise ValidationError("Invalid webhook signature")

    logger.info("webhook_received", event_type=event["type"], event_id=event["id"])

    # Check idempotency — Stripe may deliver the same event multiple times.
    # We use Redis with a 24h TTL to track already-processed event IDs.
    redis_client = get_redis_client()
    idempotency_key = f"stripe:webhook:{event['id']}"

    if redis_client.get(idempotency_key):
        logger.info("webhook_duplicate_skipped", event_id=event["id"], event_type=event["type"])
        return {"received": True, "duplicate": True}

    # Mark as processing (with TTL of 24 hours)
    redis_client.setex(idempotency_key, 86400, "processing")

    # Get Supabase service
    supabase = get_supabase_service()

    # Handle events
    event_type = event["type"]
    data = event["data"]["object"]

    try:
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(supabase, data)

        elif event_type == "customer.subscription.created":
            await handle_subscription_created(supabase, data)

        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(supabase, data)

        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(supabase, data)

        elif event_type == "invoice.payment_failed":
            await handle_payment_failed(supabase, data)

        elif event_type == "invoice.payment_succeeded":
            await handle_payment_succeeded(supabase, data)

        else:
            logger.info("webhook_unhandled", event_type=event_type)

    except Exception as e:
        logger.error(
            "webhook_handler_error",
            event_type=event_type,
            event_id=event["id"],
            error=str(e),
            traceback=traceback.format_exc(),
        )

        # Clear idempotency key so Stripe retry will be processed
        redis_client.delete(idempotency_key)

        # BUG 4 FIX: For critical events, return 500 so Stripe retries.
        # For non-critical events, return 200 to avoid unnecessary retries.
        if event_type in CRITICAL_EVENTS:
            return JSONResponse(
                status_code=500,
                content={"error": "Webhook handler failed", "event_type": event_type},
            )

    return {"received": True}


async def handle_checkout_completed(supabase, session: dict):
    """Handle successful checkout - create/update subscription."""
    logger.info("checkout_completed", session_id=session["id"])

    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not customer_id or not subscription_id:
        logger.warning("checkout_missing_data", session_id=session["id"])
        return

    # Get user by Stripe customer ID
    profile = await supabase.get_profile_by_stripe_customer(customer_id)
    if not profile:
        logger.error("checkout_user_not_found", customer_id=customer_id)
        raise ValueError(f"Profile not found for stripe customer {customer_id}")

    # BUG 7 FIX: Use asyncio.to_thread to avoid blocking the event loop
    subscription = await asyncio.to_thread(stripe.Subscription.retrieve, subscription_id)

    # Determine plan from price
    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan = get_plan_from_price(price_id)

    # Compute analyses_reset_at from the subscription period end
    period_end_dt = datetime.fromtimestamp(subscription["current_period_end"])

    # BUG 1 FIX: Reset analyses_used to 0 and update analyses_reset_at
    await supabase.update_profile(profile["id"], {
        "plan": plan,
        "analyses_limit": get_limit_for_plan(plan),
        "analyses_used": 0,
        "analyses_reset_at": period_end_dt.isoformat(),
    })

    # Create/update subscription record
    await supabase.upsert_subscription(
        user_id=profile["id"],
        stripe_subscription_id=subscription_id,
        stripe_price_id=price_id,
        status=subscription["status"],
        current_period_start=subscription["current_period_start"],
        current_period_end=subscription["current_period_end"],
    )

    logger.info("subscription_activated", user_id=profile["id"], plan=plan)

    # Send subscription confirmation email
    try:
        period_end = datetime.fromtimestamp(
            subscription["current_period_end"]
        ).strftime("%B %d, %Y")

        await send_subscription_email(
            email=profile["email"],
            name=profile.get("full_name"),
            plan=plan,
            analyses_limit=get_limit_for_plan(plan),
            next_billing_date=period_end,
        )
    except Exception as e:
        logger.warning("subscription_email_failed", error=str(e))


async def handle_subscription_created(supabase, subscription: dict):
    """Handle new subscription creation."""
    logger.info("subscription_created", subscription_id=subscription["id"])
    # Usually handled by checkout.session.completed


async def handle_subscription_updated(supabase, subscription: dict):
    """Handle subscription updates (plan changes, renewals)."""
    logger.info("subscription_updated", subscription_id=subscription["id"])

    customer_id = subscription.get("customer")
    if not customer_id:
        return

    profile = await supabase.get_profile_by_stripe_customer(customer_id)
    if not profile:
        logger.error("subscription_user_not_found", customer_id=customer_id)
        raise ValueError(f"Profile not found for stripe customer {customer_id}")

    # Get new price/plan
    price_id = subscription["items"]["data"][0]["price"]["id"]
    plan = get_plan_from_price(price_id)

    # Compute analyses_reset_at from the subscription period end
    period_end_dt = datetime.fromtimestamp(subscription["current_period_end"])

    # BUG 3 FIX: Reset analyses_used and update analyses_reset_at on plan change
    profile_update = {
        "plan": plan,
        "analyses_limit": get_limit_for_plan(plan),
    }

    # Only reset usage counter if the plan actually changed
    if profile.get("plan") != plan:
        profile_update["analyses_used"] = 0
        profile_update["analyses_reset_at"] = period_end_dt.isoformat()

    await supabase.update_profile(profile["id"], profile_update)

    # Update subscription record
    await supabase.upsert_subscription(
        user_id=profile["id"],
        stripe_subscription_id=subscription["id"],
        stripe_price_id=price_id,
        status=subscription["status"],
        current_period_start=subscription["current_period_start"],
        current_period_end=subscription["current_period_end"],
        cancel_at=subscription.get("cancel_at"),
    )

    logger.info("subscription_plan_updated", user_id=profile["id"], plan=plan)


async def handle_subscription_deleted(supabase, subscription: dict):
    """Handle subscription cancellation."""
    logger.info("subscription_deleted", subscription_id=subscription["id"])

    customer_id = subscription.get("customer")
    if not customer_id:
        return

    profile = await supabase.get_profile_by_stripe_customer(customer_id)
    if not profile:
        return

    # Downgrade to free plan
    await supabase.update_profile(profile["id"], {
        "plan": "free",
        "analyses_limit": settings.QUOTA_FREE,
    })

    # Update subscription status
    await supabase.update_subscription_status(
        subscription["id"],
        status="canceled",
    )

    logger.info("subscription_canceled", user_id=profile["id"])


async def handle_payment_failed(supabase, invoice: dict):
    """Handle failed payment."""
    logger.warning("payment_failed", invoice_id=invoice["id"])

    customer_id = invoice.get("customer")
    if not customer_id:
        return

    profile = await supabase.get_profile_by_stripe_customer(customer_id)
    if not profile:
        return

    # Log for monitoring/alerting
    logger.warning(
        "user_payment_failed",
        user_id=profile["id"],
        invoice_id=invoice["id"],
    )

    # TODO: Send email notification to user


async def handle_payment_succeeded(supabase, invoice: dict):
    """Handle successful payment (renewal)."""
    logger.info("payment_succeeded", invoice_id=invoice["id"])

    # Reset monthly quota on successful payment
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    profile = await supabase.get_profile_by_stripe_customer(customer_id)
    if not profile:
        return

    # Reset analyses count
    await supabase.reset_analyses_used(profile["id"])

    logger.info("quota_reset", user_id=profile["id"])


def get_plan_from_price(price_id: str) -> str:
    """Map Stripe price ID to plan name.

    Raises ValueError if the price_id is not recognized, to prevent
    silent downgrades to free when config is wrong.
    """
    if price_id == settings.STRIPE_PRICE_PRO_MONTHLY:
        return "pro"
    elif price_id == settings.STRIPE_PRICE_AGENCY_MONTHLY:
        return "agency"

    # BUG 6 FIX: Do NOT default to "free" — raise so the webhook returns 500
    # and Stripe retries, giving us time to fix the config.
    logger.critical(
        "unknown_stripe_price_id",
        price_id=price_id,
        configured_pro=settings.STRIPE_PRICE_PRO_MONTHLY,
        configured_agency=settings.STRIPE_PRICE_AGENCY_MONTHLY,
    )
    raise ValueError(
        f"Unknown Stripe price_id '{price_id}' — cannot determine plan. "
        f"Configured: pro={settings.STRIPE_PRICE_PRO_MONTHLY}, agency={settings.STRIPE_PRICE_AGENCY_MONTHLY}"
    )


def get_limit_for_plan(plan: str) -> int:
    """Get analysis limit for a plan."""
    limits = {
        "free": settings.QUOTA_FREE,
        "pro": settings.QUOTA_PRO,
        "agency": settings.QUOTA_AGENCY,
    }
    return limits.get(plan, settings.QUOTA_FREE)


@router.post("/auth")
async def handle_auth_webhook(request: Request):
    """
    Handle Supabase Auth webhooks.
    Triggered when a new user signs up.
    """
    try:
        payload = await request.json()
        event_type = payload.get("type")

        if event_type == "INSERT" and payload.get("table") == "users":
            record = payload.get("record", {})
            email = record.get("email")

            if email:
                # Send welcome email
                await send_welcome_email(email=email, name=None)
                # Add to marketing list
                await add_contact_to_list(email=email)

        return {"status": "ok"}
    except Exception as e:
        logger.error("auth_webhook_error", error=str(e))
        return {"status": "error"}
