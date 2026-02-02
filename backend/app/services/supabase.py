"""
Supabase client singleton and utilities.
"""
from functools import lru_cache
from typing import Any, Dict, List, Optional

from supabase import Client, create_client

from app.config import settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    Get cached Supabase client instance.
    Uses service key for server-side operations (bypasses RLS).
    
    Returns:
        Supabase client configured with service key
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_KEY,
    )


@lru_cache()
def get_supabase_anon_client() -> Client:
    """
    Get cached Supabase client with anon key.
    Use this for operations that should respect RLS.
    
    Returns:
        Supabase client configured with anon key
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY,
    )


class SupabaseService:
    """
    Service class for Supabase operations.
    Provides type-safe wrappers around common operations.
    """
    
    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_client()
    
    # -------------------------------------------------------------------------
    # Generic CRUD operations
    # -------------------------------------------------------------------------
    
    async def get_by_id(
        self,
        table: str,
        id: str,
        select: str = "*",
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single record by ID.
        
        Args:
            table: Table name
            id: Record UUID
            select: Columns to select
            
        Returns:
            Record dict or None if not found
        """
        response = (
            self.client
            .table(table)
            .select(select)
            .eq("id", id)
            .single()
            .execute()
        )
        return response.data if response.data else None
    
    async def get_by_field(
        self,
        table: str,
        field: str,
        value: Any,
        select: str = "*",
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single record by field value.
        
        Args:
            table: Table name
            field: Field name to filter by
            value: Field value
            select: Columns to select
            
        Returns:
            Record dict or None if not found
        """
        response = (
            self.client
            .table(table)
            .select(select)
            .eq(field, value)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None
    
    async def list(
        self,
        table: str,
        select: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        order_by: str = "created_at",
        ascending: bool = False,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        List records with filtering and pagination.
        
        Args:
            table: Table name
            select: Columns to select
            filters: Dict of field -> value filters (eq only)
            order_by: Column to sort by
            ascending: Sort direction
            limit: Max records to return
            offset: Records to skip
            
        Returns:
            List of record dicts
        """
        query = self.client.table(table).select(select)
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                query = query.eq(field, value)
        
        # Apply ordering and pagination
        response = (
            query
            .order(order_by, desc=not ascending)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return response.data or []
    
    async def count(
        self,
        table: str,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """
        Count records matching filters.
        
        Args:
            table: Table name
            filters: Dict of field -> value filters
            
        Returns:
            Count of matching records
        """
        query = self.client.table(table).select("*", count="exact")
        
        if filters:
            for field, value in filters.items():
                query = query.eq(field, value)
        
        response = query.limit(0).execute()
        return response.count or 0
    
    async def create(
        self,
        table: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create a new record.
        
        Args:
            table: Table name
            data: Record data
            
        Returns:
            Created record dict
        """
        response = (
            self.client
            .table(table)
            .insert(data)
            .execute()
        )
        return response.data[0]
    
    async def update(
        self,
        table: str,
        id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Update a record by ID.
        
        Args:
            table: Table name
            id: Record UUID
            data: Fields to update
            
        Returns:
            Updated record dict
        """
        response = (
            self.client
            .table(table)
            .update(data)
            .eq("id", id)
            .execute()
        )
        return response.data[0]
    
    async def delete(
        self,
        table: str,
        id: str,
    ) -> bool:
        """
        Delete a record by ID.
        
        Args:
            table: Table name
            id: Record UUID
            
        Returns:
            True if deleted
        """
        self.client.table(table).delete().eq("id", id).execute()
        return True
    
    # -------------------------------------------------------------------------
    # Profile-specific operations
    # -------------------------------------------------------------------------
    
    async def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by user ID."""
        return await self.get_by_id("profiles", user_id)
    
    async def update_profile(
        self,
        user_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update user profile."""
        return await self.update("profiles", user_id, data)
    
    async def get_profile_by_stripe_customer(
        self,
        stripe_customer_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get profile by Stripe customer ID."""
        return await self.get_by_field(
            "profiles",
            "stripe_customer_id",
            stripe_customer_id,
        )


# Singleton instance
supabase_service = SupabaseService()
