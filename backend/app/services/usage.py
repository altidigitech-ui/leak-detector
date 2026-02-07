"""
Usage tracking service for cost monitoring.
"""

from app.config import settings
from app.core.logging import get_logger
from app.services.supabase import SupabaseService

logger = get_logger(__name__)


async def log_analysis_cost(
    supabase: SupabaseService,
    user_id: str,
    analysis_id: str,
    tokens_input: int,
    tokens_output: int,
    duration_ms: int,
    success: bool,
) -> None:
    """Log analysis cost for tracking."""
    try:
        # Use config-based cost estimation instead of hardcoded per-token pricing
        # This is more maintainable when switching models
        total_cost = settings.COST_PER_ANALYSIS_CLAUDE + settings.COST_PER_ANALYSIS_INFRA

        await supabase._post("usage_logs", {
            "user_id": user_id,
            "action": "analysis",
            "metadata": {
                "analysis_id": analysis_id,
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
                "duration_ms": duration_ms,
                "success": success,
                "estimated_cost": round(total_cost, 4),
                "model": settings.ANTHROPIC_MODEL,
            },
        })

        logger.info("usage_logged", user_id=user_id, analysis_id=analysis_id, cost=total_cost)
    except Exception as e:
        logger.warning("usage_log_failed", error=str(e))
