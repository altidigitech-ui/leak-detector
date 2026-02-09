"""
Email service using Brevo (ex-Sendinblue).
Handles all transactional emails.
"""

from typing import Optional
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Configure API client
configuration = sib_api_v3_sdk.Configuration()
configuration.api_key['api-key'] = settings.BREVO_API_KEY

api_client = sib_api_v3_sdk.ApiClient(configuration)
transactional_api = sib_api_v3_sdk.TransactionalEmailsApi(api_client)
contacts_api = sib_api_v3_sdk.ContactsApi(api_client)


async def send_welcome_email(email: str, name: Optional[str] = None) -> bool:
    """
    Send welcome email to new user.
    Template ID: 1
    """
    if not settings.BREVO_API_KEY:
        logger.warning("brevo_not_configured", action="welcome_email")
        return False

    try:
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": email, "name": name or "there"}],
            template_id=1,
            params={
                "name": name or "there",
            },
        )
        transactional_api.send_transac_email(send_smtp_email)
        logger.info("welcome_email_sent")
        return True
    except ApiException as e:
        logger.error("welcome_email_failed", error=str(e))
        return False


async def send_analysis_complete_email(
    email: str,
    name: Optional[str],
    url: str,
    score: int,
    report_id: str,
    critical_count: int,
    remaining: int,
) -> bool:
    """
    Send email when analysis is complete.
    Template ID: 2
    """
    if not settings.BREVO_API_KEY:
        logger.warning("brevo_not_configured", action="analysis_email")
        return False

    try:
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": email, "name": name or "there"}],
            template_id=2,
            params={
                "name": name or "there",
                "url": url,
                "score": score,
                "report_url": f"{settings.FRONTEND_URL}/reports/{report_id}",
                "critical_count": critical_count,
                "remaining": remaining,
            },
        )
        transactional_api.send_transac_email(send_smtp_email)
        logger.info("analysis_email_sent", report_id=report_id)
        return True
    except ApiException as e:
        logger.error("analysis_email_failed", report_id=report_id, error=str(e))
        return False


async def send_subscription_email(
    email: str,
    name: Optional[str],
    plan: str,
    analyses_limit: int,
    next_billing_date: str,
) -> bool:
    """
    Send email when subscription is confirmed.
    Template ID: 3
    """
    if not settings.BREVO_API_KEY:
        logger.warning("brevo_not_configured", action="subscription_email")
        return False

    features_map = {
        "pro": "Detailed reports, PDF export, priority support",
        "agency": "200 analyses/month, PDF export, dedicated support",
    }

    try:
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": email, "name": name or "there"}],
            template_id=3,
            params={
                "name": name or "there",
                "plan": plan.capitalize(),
                "analyses_limit": analyses_limit,
                "features": features_map.get(plan, ""),
                "next_billing_date": next_billing_date,
            },
        )
        transactional_api.send_transac_email(send_smtp_email)
        logger.info("subscription_email_sent", plan=plan)
        return True
    except ApiException as e:
        logger.error("subscription_email_failed", plan=plan, error=str(e))
        return False


async def add_contact_to_list(
    email: str,
    name: Optional[str] = None,
    list_id: int = 2,
) -> bool:
    """
    Add contact to Brevo list for marketing.
    Default list_id=2 is "All Users".
    """
    if not settings.BREVO_API_KEY:
        return False

    try:
        create_contact = sib_api_v3_sdk.CreateContact(
            email=email,
            attributes={"FIRSTNAME": name.split()[0] if name else ""},
            list_ids=[list_id],
            update_enabled=True,
        )
        contacts_api.create_contact(create_contact)
        logger.info("contact_added_to_list", list_id=list_id)
        return True
    except ApiException as e:
        # Contact may already exist, not critical
        logger.warning("contact_add_failed", list_id=list_id, error=str(e))
        return False
