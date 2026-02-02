/**
 * Global type definitions
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ============================================================================
// User & Auth Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier | null;
  credits_remaining: number;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus = 
  | 'free'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing';

export type SubscriptionTier = 
  | 'pro'
  | 'enterprise';

// ============================================================================
// Common Types
// ============================================================================

export type Status = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'canceled';

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface WithChildren {
  children: React.ReactNode;
}

export interface WithClassName {
  className?: string;
}

// ============================================================================
// Feature-specific Types (add your own)
// ============================================================================

// Example:
// export interface Report extends Timestamps {
//   id: string;
//   user_id: string;
//   url: string;
//   status: Status;
//   result: ReportResult | null;
// }
