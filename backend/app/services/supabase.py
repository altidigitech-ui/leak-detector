"""
Supabase service - Database operations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from supabase import create_client, Client

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SupabaseService:
    """Service for Supabase database operations."""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,  # Use service key for backend
        )
    
    # ==================== PROFILES ====================
    
    async def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID."""
        response = self.client.table("profiles").select("*").eq("id", user_id).single().execute()
        return response.data if response.data else None
    
    async def get_profile_by_stripe_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by Stripe customer ID."""
        response = self.client.table("profiles").select("*").eq("stripe_customer_id", customer_id).single().execute()
        return response.data if response.data else None
    
    async def update_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile."""
        response = self.client.table("profiles").update(data).eq("id", user_id).execute()
        return response.data[0] if response.data else {}
    
    async def increment_analyses_used(self, user_id: str) -> None:
        """Increment the analyses_used counter."""
        # Use RPC for atomic increment
        self.client.rpc("increment_analyses_used", {"p_user_id": user_id}).execute()
    
    async def reset_analyses_used(self, user_id: str) -> None:
        """Reset analyses_used to 0."""
        await self.update_profile(user_id, {"analyses_used": 0})
    
    # ==================== ANALYSES ====================
    
    async def create_analysis(self, user_id: str, url: str) -> Dict[str, Any]:
        """Create a new analysis record."""
        response = self.client.table("analyses").insert({
            "user_id": user_id,
            "url": url,
            "status": "pending",
        }).execute()
        return response.data[0]
    
    async def get_analysis(self, analysis_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get analysis by ID (with user check)."""
        response = self.client.table("analyses").select("*").eq("id", analysis_id).eq("user_id", user_id).single().execute()
        return response.data if response.data else None
    
    async def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """Get analysis by ID (no user check - for workers)."""
        response = self.client.table("analyses").select("*").eq("id", analysis_id).single().execute()
        return response.data if response.data else None
    
    async def list_analyses(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List analyses for a user with pagination."""
        # Get total count
        count_response = self.client.table("analyses").select("id", count="exact").eq("user_id", user_id).execute()
        total = count_response.count or 0
        
        # Get paginated results
        response = self.client.table("analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        return response.data or [], total
    
    async def update_analysis_status(
        self,
        analysis_id: str,
        status: str,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update analysis status."""
        data = {"status": status}
        
        if status == "processing":
            data["started_at"] = datetime.utcnow().isoformat()
        elif status in ("completed", "failed"):
            data["completed_at"] = datetime.utcnow().isoformat()
        
        if error_code:
            data["error_code"] = error_code
        if error_message:
            data["error_message"] = error_message
        
        self.client.table("analyses").update(data).eq("id", analysis_id).execute()
    
    # ==================== REPORTS ====================
    
    async def create_report(
        self,
        analysis_id: str,
        score: int,
        summary: str,
        categories: List[Dict[str, Any]],
        screenshot_url: Optional[str] = None,
        page_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Create a new report."""
        response = self.client.table("reports").insert({
            "analysis_id": analysis_id,
            "score": score,
            "summary": summary,
            "categories": categories,
            "issues": [],  # Extracted from categories
            "screenshot_url": screenshot_url,
            "page_metadata": page_metadata or {},
        }).execute()
        return response.data[0]
    
    async def get_report(self, report_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get report by ID with analysis join."""
        response = self.client.table("reports").select("*, analyses!inner(url, user_id)").eq("id", report_id).eq("analyses.user_id", user_id).single().execute()
        return response.data if response.data else None
    
    async def get_report_by_analysis(self, analysis_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get report by analysis ID."""
        response = self.client.table("reports").select("*, analyses!inner(url, user_id)").eq("analysis_id", analysis_id).eq("analyses.user_id", user_id).single().execute()
        return response.data if response.data else None
    
    async def list_reports(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List reports for a user with pagination."""
        # Get total count
        count_response = self.client.table("reports").select("id, analyses!inner(user_id)", count="exact").eq("analyses.user_id", user_id).execute()
        total = count_response.count or 0
        
        # Get paginated results
        response = self.client.table("reports").select("*, analyses!inner(url, user_id)").eq("analyses.user_id", user_id).order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        return response.data or [], total
    
    # ==================== SUBSCRIPTIONS ====================
    
    async def upsert_subscription(
        self,
        user_id: str,
        stripe_subscription_id: str,
        stripe_price_id: str,
        status: str,
        current_period_start: int,
        current_period_end: int,
        cancel_at: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create or update a subscription record."""
        data = {
            "user_id": user_id,
            "stripe_subscription_id": stripe_subscription_id,
            "stripe_price_id": stripe_price_id,
            "status": status,
            "current_period_start": datetime.fromtimestamp(current_period_start).isoformat(),
            "current_period_end": datetime.fromtimestamp(current_period_end).isoformat(),
        }
        
        if cancel_at:
            data["cancel_at"] = datetime.fromtimestamp(cancel_at).isoformat()
        
        response = self.client.table("subscriptions").upsert(
            data,
            on_conflict="stripe_subscription_id",
        ).execute()
        
        return response.data[0] if response.data else {}
    
    async def get_active_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get active subscription for user."""
        response = self.client.table("subscriptions").select("*").eq("user_id", user_id).eq("status", "active").single().execute()
        return response.data if response.data else None
    
    async def update_subscription_status(self, stripe_subscription_id: str, status: str) -> None:
        """Update subscription status."""
        self.client.table("subscriptions").update({"status": status}).eq("stripe_subscription_id", stripe_subscription_id).execute()
    
    # ==================== STORAGE ====================
    
    async def upload_screenshot(self, analysis_id: str, data: bytes) -> str:
        """Upload screenshot to Supabase Storage."""
        path = f"screenshots/{analysis_id}.png"
        
        self.client.storage.from_("screenshots").upload(
            path,
            data,
            {"content-type": "image/png"},
        )
        
        # Get public URL
        url = self.client.storage.from_("screenshots").get_public_url(path)
        return url


# Singleton instance
_supabase_service: Optional[SupabaseService] = None


def get_supabase_service() -> SupabaseService:
    """Get or create Supabase service instance."""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
