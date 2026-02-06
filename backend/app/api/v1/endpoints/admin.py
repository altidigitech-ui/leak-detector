"""
Admin endpoints - Metrics and dashboard data.
Only accessible by admin emails.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.api.deps import CurrentUserID, Supabase
from app.config import settings
from app.core.errors import AuthorizationError
from app.core.limiter import limiter
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ============== SCHEMAS ==============

class UserMetrics(BaseModel):
    total_users: int
    users_today: int
    users_this_week: int
    users_this_month: int
    users_by_plan: dict


class AnalysisMetrics(BaseModel):
    total_analyses: int
    analyses_today: int
    analyses_this_week: int
    analyses_this_month: int
    success_rate: float
    avg_score: float
    analyses_by_status: dict


class RevenueMetrics(BaseModel):
    mrr: float
    total_revenue: float
    customers_pro: int
    customers_agency: int
    conversion_rate: float


class CostMetrics(BaseModel):
    estimated_monthly_cost: float
    cost_breakdown: dict
    analyses_this_month: int
    cost_per_analysis: float


class RecentUser(BaseModel):
    id: str
    email: str
    plan: str
    analyses_used: int
    created_at: datetime


class RecentAnalysis(BaseModel):
    id: str
    url: str
    status: str
    score: Optional[int] = None
    user_email: str
    created_at: datetime


class AdminDashboard(BaseModel):
    users: UserMetrics
    analyses: AnalysisMetrics
    revenue: RevenueMetrics
    costs: CostMetrics
    recent_users: List[RecentUser]
    recent_analyses: List[RecentAnalysis]


# ============== HELPER ==============

async def verify_admin(user_id: str, supabase: Supabase) -> bool:
    """Verify user is an admin by email."""
    profile = await supabase.get_profile(user_id)
    if not profile:
        return False
    return profile.get("email") in settings.ADMIN_EMAILS


# ============== ENDPOINTS ==============

@router.get("/dashboard", response_model=AdminDashboard)
@limiter.limit("30/minute")
async def get_admin_dashboard(
    request: Request,
    user_id: CurrentUserID,
    supabase: Supabase,
):
    """Get complete admin dashboard with all metrics."""
    if not await verify_admin(user_id, supabase):
        raise AuthorizationError("Admin access required")

    logger.info("admin_dashboard_accessed", user_id=user_id)

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=now.weekday())
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ===== USER METRICS =====
    all_users = await supabase.admin_get_all_profiles()

    users_by_plan = {"free": 0, "pro": 0, "agency": 0}
    users_today = 0
    users_this_week = 0
    users_this_month = 0

    for user in all_users:
        plan = user.get("plan", "free")
        users_by_plan[plan] = users_by_plan.get(plan, 0) + 1

        created = datetime.fromisoformat(user["created_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        if created >= today_start:
            users_today += 1
        if created >= week_start:
            users_this_week += 1
        if created >= month_start:
            users_this_month += 1

    user_metrics = UserMetrics(
        total_users=len(all_users),
        users_today=users_today,
        users_this_week=users_this_week,
        users_this_month=users_this_month,
        users_by_plan=users_by_plan,
    )

    # ===== ANALYSIS METRICS =====
    all_analyses = await supabase.admin_get_all_analyses()

    analyses_by_status = {"pending": 0, "processing": 0, "completed": 0, "failed": 0}
    analyses_today = 0
    analyses_this_week = 0
    analyses_this_month = 0

    for analysis in all_analyses:
        status = analysis.get("status", "pending")
        analyses_by_status[status] = analyses_by_status.get(status, 0) + 1

        created = datetime.fromisoformat(analysis["created_at"].replace("Z", "+00:00")).replace(tzinfo=None)
        if created >= today_start:
            analyses_today += 1
        if created >= week_start:
            analyses_this_week += 1
        if created >= month_start:
            analyses_this_month += 1

    total_completed = analyses_by_status.get("completed", 0)
    total_failed = analyses_by_status.get("failed", 0)
    success_rate = (total_completed / (total_completed + total_failed) * 100) if (total_completed + total_failed) > 0 else 0

    # Get average score from reports
    all_reports = await supabase.admin_get_all_report_scores()
    avg_score = sum(r["score"] for r in all_reports) / len(all_reports) if all_reports else 0

    analysis_metrics = AnalysisMetrics(
        total_analyses=len(all_analyses),
        analyses_today=analyses_today,
        analyses_this_week=analyses_this_week,
        analyses_this_month=analyses_this_month,
        success_rate=round(success_rate, 1),
        avg_score=round(avg_score, 1),
        analyses_by_status=analyses_by_status,
    )

    # ===== REVENUE METRICS =====
    pro_customers = users_by_plan.get("pro", 0)
    agency_customers = users_by_plan.get("agency", 0)

    mrr = (pro_customers * 29) + (agency_customers * 99)

    paying_users = pro_customers + agency_customers
    total_users_count = len(all_users)
    conversion_rate = (paying_users / total_users_count * 100) if total_users_count > 0 else 0

    revenue_metrics = RevenueMetrics(
        mrr=mrr,
        total_revenue=mrr,
        customers_pro=pro_customers,
        customers_agency=agency_customers,
        conversion_rate=round(conversion_rate, 2),
    )

    # ===== COST METRICS =====
    cost_per_analysis = settings.COST_PER_ANALYSIS_CLAUDE + settings.COST_PER_ANALYSIS_INFRA
    estimated_monthly_cost = analyses_this_month * cost_per_analysis

    base_infra_cost = 25  # Approximate monthly base cost

    cost_metrics = CostMetrics(
        estimated_monthly_cost=round(estimated_monthly_cost + base_infra_cost, 2),
        cost_breakdown={
            "claude_api": round(analyses_this_month * settings.COST_PER_ANALYSIS_CLAUDE, 2),
            "infrastructure": round(analyses_this_month * settings.COST_PER_ANALYSIS_INFRA + base_infra_cost, 2),
        },
        analyses_this_month=analyses_this_month,
        cost_per_analysis=round(cost_per_analysis, 3),
    )

    # ===== RECENT USERS =====
    recent_users_data = all_users[:10]  # Already sorted by created_at desc
    recent_users = [
        RecentUser(
            id=u["id"],
            email=u["email"],
            plan=u.get("plan", "free"),
            analyses_used=u.get("analyses_used", 0),
            created_at=datetime.fromisoformat(u["created_at"].replace("Z", "+00:00")),
        )
        for u in recent_users_data
    ]

    # ===== RECENT ANALYSES =====
    recent_analyses_data = await supabase.admin_get_recent_analyses(limit=10)

    analysis_ids = [a["id"] for a in recent_analyses_data]
    reports_data = await supabase.admin_get_reports_by_analysis_ids(analysis_ids)
    reports_scores = {r["analysis_id"]: r["score"] for r in reports_data}

    user_ids = list(set(a["user_id"] for a in recent_analyses_data))
    users_data = await supabase.admin_get_profiles_by_ids(user_ids)
    user_emails = {u["id"]: u["email"] for u in users_data}

    recent_analyses = [
        RecentAnalysis(
            id=a["id"],
            url=a["url"][:50] + "..." if len(a["url"]) > 50 else a["url"],
            status=a["status"],
            score=reports_scores.get(a["id"]),
            user_email=user_emails.get(a["user_id"], "unknown"),
            created_at=datetime.fromisoformat(a["created_at"].replace("Z", "+00:00")),
        )
        for a in recent_analyses_data
    ]

    return AdminDashboard(
        users=user_metrics,
        analyses=analysis_metrics,
        revenue=revenue_metrics,
        costs=cost_metrics,
        recent_users=recent_users,
        recent_analyses=recent_analyses,
    )


@router.get("/users")
@limiter.limit("30/minute")
async def get_all_users(
    request: Request,
    user_id: CurrentUserID,
    supabase: Supabase,
    limit: int = 50,
    offset: int = 0,
):
    """Get paginated list of all users."""
    if not await verify_admin(user_id, supabase):
        raise AuthorizationError("Admin access required")

    data, total = await supabase.admin_get_profiles_paginated(limit=limit, offset=offset)

    return {
        "data": data,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/analyses")
@limiter.limit("30/minute")
async def get_all_analyses(
    request: Request,
    user_id: CurrentUserID,
    supabase: Supabase,
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
):
    """Get paginated list of all analyses."""
    if not await verify_admin(user_id, supabase):
        raise AuthorizationError("Admin access required")

    data, total = await supabase.admin_get_analyses_paginated(
        limit=limit, offset=offset, status=status,
    )

    return {
        "data": data,
        "total": total,
        "limit": limit,
        "offset": offset,
    }
