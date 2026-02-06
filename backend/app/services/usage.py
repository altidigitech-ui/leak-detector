"""
Usage tracking service for cost monitoring.
"""

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
        cost_input = (tokens_input / 1000) * 0.003
        cost_output = (tokens_output / 1000) * 0.015
        total_cost = cost_input + cost_output

        supabase._post("usage_logs", {
            "user_id": user_id,
            "action": "analysis",
            "metadata": {
                "analysis_id": analysis_id,
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
                "duration_ms": duration_ms,
                "success": success,
                "estimated_cost": round(total_cost, 4),
            },
        })

        logger.info(
            "usage_logged",
            user_id=user_id,
            analysis_id=analysis_id,
            cost=total_cost,
        )
    except Exception as e:
        logger.warning("usage_log_failed", error=str(e))
