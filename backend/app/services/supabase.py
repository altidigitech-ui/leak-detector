"""
Supabase service - Database operations via direct PostgREST API.

Uses httpx to call Supabase PostgREST/Storage APIs directly,
bypassing the supabase-py SDK to avoid dependency version conflicts.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SupabaseService:
    """Service for Supabase database operations via REST API."""

    def __init__(self):
        self._rest_url = f"{settings.SUPABASE_URL}/rest/v1"
        self._storage_url = f"{settings.SUPABASE_URL}/storage/v1"
        self._rpc_url = f"{self._rest_url}/rpc"
        self._headers = {
            "apikey": settings.SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        }
        self._client = httpx.Client(headers=self._headers, timeout=30.0)

    def _get(self, table, params=None, single=False, count=False, range_header=None):
        headers = {}
        if single:
            headers["Accept"] = "application/vnd.pgrst.object+json"
        if count:
            headers["Prefer"] = "count=exact"
        if range_header:
            headers["Range"] = range_header
        response = self._client.get(f"{self._rest_url}/{table}", params=params or {}, headers=headers)
        if response.status_code == 406 and single:
            return None if not count else (None, 0)
        response.raise_for_status()
        if count:
            content_range = response.headers.get("content-range", "")
            total = 0
            if "/" in content_range:
                total_str = content_range.split("/")[-1]
                if total_str != "*":
                    total = int(total_str)
            return response.json(), total
        return response.json()

    def _post(self, table, data, upsert_conflict=None):
        headers = {"Prefer": "return=representation"}
        if upsert_conflict:
            headers["Prefer"] = "return=representation,resolution=merge-duplicates"
            headers["on-conflict"] = upsert_conflict
        response = self._client.post(f"{self._rest_url}/{table}", json=data, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result[0] if isinstance(result, list) and result else result

    def _patch(self, table, data, params):
        headers = {"Prefer": "return=representation"}
        response = self._client.patch(f"{self._rest_url}/{table}", json=data, params=params, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result[0] if isinstance(result, list) and result else result

    def _rpc(self, function_name, params):
        response = self._client.post(f"{self._rpc_url}/{function_name}", json=params)
        response.raise_for_status()
        # Some RPC functions return void (204 No Content) - handle empty body
        if not response.content or response.status_code == 204:
            return None
        return response.json()

    async def get_profile(self, user_id):
        return self._get("profiles", params={"select": "*", "id": f"eq.{user_id}"}, single=True)

    async def get_profile_by_stripe_customer(self, customer_id):
        return self._get("profiles", params={"select": "*", "stripe_customer_id": f"eq.{customer_id}"}, single=True)

    async def update_profile(self, user_id, data):
        return self._patch("profiles", data=data, params={"id": f"eq.{user_id}"})

    async def increment_analyses_used(self, user_id):
        self._rpc("increment_analyses_used", {"p_user_id": user_id})

    async def reset_analyses_used(self, user_id):
        await self.update_profile(user_id, {"analyses_used": 0})

    async def create_analysis(self, user_id, url):
        return self._post("analyses", {"user_id": user_id, "url": url, "status": "pending"})

    async def get_analysis(self, analysis_id, user_id):
        return self._get("analyses", params={"select": "*", "id": f"eq.{analysis_id}", "user_id": f"eq.{user_id}"}, single=True)

    async def get_analysis_by_id(self, analysis_id):
        return self._get("analyses", params={"select": "*", "id": f"eq.{analysis_id}"}, single=True)

    async def list_analyses(self, user_id, limit=20, offset=0):
        data, total = self._get("analyses", params={"select": "*", "user_id": f"eq.{user_id}", "order": "created_at.desc"}, count=True, range_header=f"{offset}-{offset + limit - 1}")
        return data or [], total

    async def update_analysis_status(self, analysis_id, status, error_code=None, error_message=None):
        data = {"status": status}
        if status == "processing":
            data["started_at"] = datetime.utcnow().isoformat()
        elif status in ("completed", "failed"):
            data["completed_at"] = datetime.utcnow().isoformat()
        if error_code:
            data["error_code"] = error_code
        if error_message:
            data["error_message"] = error_message
        self._patch("analyses", data=data, params={"id": f"eq.{analysis_id}"})

    async def create_report(self, analysis_id, score, summary, categories, screenshot_url=None, page_metadata=None):
        return self._post("reports", {"analysis_id": analysis_id, "score": score, "summary": summary, "categories": categories, "issues": [], "screenshot_url": screenshot_url, "page_metadata": page_metadata or {}})

    async def get_report(self, report_id, user_id):
        return self._get("reports", params={"select": "*,analyses!inner(url,user_id)", "id": f"eq.{report_id}", "analyses.user_id": f"eq.{user_id}"}, single=True)

    async def get_report_by_analysis(self, analysis_id, user_id):
        return self._get("reports", params={"select": "*,analyses!inner(url,user_id)", "analysis_id": f"eq.{analysis_id}", "analyses.user_id": f"eq.{user_id}"}, single=True)

    async def list_reports(self, user_id, limit=20, offset=0):
        data, total = self._get("reports", params={"select": "*,analyses!inner(url,user_id)", "analyses.user_id": f"eq.{user_id}", "order": "created_at.desc"}, count=True, range_header=f"{offset}-{offset + limit - 1}")
        return data or [], total

    async def upsert_subscription(self, user_id, stripe_subscription_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at=None):
        data = {"user_id": user_id, "stripe_subscription_id": stripe_subscription_id, "stripe_price_id": stripe_price_id, "status": status, "current_period_start": datetime.fromtimestamp(current_period_start).isoformat(), "current_period_end": datetime.fromtimestamp(current_period_end).isoformat()}
        if cancel_at:
            data["cancel_at"] = datetime.fromtimestamp(cancel_at).isoformat()
        headers = {"Prefer": "return=representation,resolution=merge-duplicates"}
        response = self._client.post(f"{self._rest_url}/subscriptions", json=data, params={"on_conflict": "stripe_subscription_id"}, headers=headers)
        response.raise_for_status()
        result = response.json()
        return result[0] if isinstance(result, list) and result else {}

    async def get_active_subscription(self, user_id):
        return self._get("subscriptions", params={"select": "*", "user_id": f"eq.{user_id}", "status": "eq.active"}, single=True)

    async def update_subscription_status(self, stripe_subscription_id, status):
        self._patch("subscriptions", data={"status": status}, params={"stripe_subscription_id": f"eq.{stripe_subscription_id}"})

    async def upload_screenshot(self, analysis_id, data):
        path = f"screenshots/{analysis_id}.png"
        response = self._client.post(f"{self._storage_url}/object/screenshots/{path}", content=data, headers={"Content-Type": "image/png", "x-upsert": "true"})
        response.raise_for_status()
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/screenshots/{path}"


_supabase_service: Optional[SupabaseService] = None


def get_supabase_service() -> SupabaseService:
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
