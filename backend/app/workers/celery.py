"""
Celery configuration and app instance.
"""

from celery import Celery
import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration

from app.config import settings

# Initialize Sentry for Celery workers
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        integrations=[CeleryIntegration()],
        traces_sample_rate=0.1,
    )

# Create Celery app
celery_app = Celery(
    "leak_detector",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks.analyze"],
)

# Configure Celery
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution settings
    task_soft_time_limit=180,  # Soft limit: 180 seconds
    task_time_limit=240,       # Hard limit: 240 seconds
    task_acks_late=True,      # Acknowledge after task completes
    
    # Worker settings
    worker_prefetch_multiplier=1,  # One task at a time per worker
    worker_concurrency=2,          # 2 concurrent workers
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    
    # Retry settings
    task_default_retry_delay=30,  # 30 seconds between retries
    task_max_retries=2,           # Max 2 retries
    
    # Task routes (optional, for scaling)
    task_routes={
        "app.workers.tasks.analyze.*": {"queue": "analysis"},
    },
)

# Optional: Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Example: Reset quotas monthly (handled by Supabase trigger instead)
    # "reset-monthly-quotas": {
    #     "task": "app.workers.tasks.maintenance.reset_quotas",
    #     "schedule": crontab(day_of_month=1, hour=0, minute=0),
    # },
}
