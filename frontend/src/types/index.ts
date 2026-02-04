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
  limit: number;
  offset: number;
  total: number;
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
  plan: Plan;
  stripe_customer_id: string | null;
  analyses_used: number;
  analyses_limit: number;
  analyses_reset_at: string;
  created_at: string;
  updated_at: string;
}

export type Plan =
  | 'free'
  | 'pro'
  | 'agency';

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
// Analysis Types
// ============================================================================

export interface Analysis {
  id: string;
  url: string;
  status: Status;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ============================================================================
// Report Types
// ============================================================================

export interface ReportIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

export interface ReportCategory {
  name: string;
  label: string;
  score: number;
  issues: ReportIssue[];
}

export interface PageMetadata {
  title: string | null;
  load_time_ms: number | null;
  word_count: number | null;
  image_count: number | null;
}

export interface Report {
  id: string;
  analysis_id: string;
  url: string;
  score: number;
  summary: string;
  categories: ReportCategory[];
  screenshot_url: string | null;
  page_metadata: PageMetadata | null;
  created_at: string;
}

export interface ReportListItem {
  id: string;
  analysis_id: string;
  url: string;
  score: number;
  summary: string;
  created_at: string;
}

// ============================================================================
// Billing Types
// ============================================================================

export interface SubscriptionInfo {
  status: string;
  current_period_end: string;
}

export interface BillingStatus {
  plan: Plan;
  analyses_used: number;
  analyses_limit: number;
  analyses_reset_at: string;
  stripe_customer_id: string | null;
  subscription: SubscriptionInfo | null;
}
