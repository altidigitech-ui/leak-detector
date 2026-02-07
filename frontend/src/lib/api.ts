import type { Analysis, Report, ReportListItem, BillingStatus, PaginationMeta } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: PaginationMeta;
}

/**
 * Custom API error with structured error information.
 */
export class ApiError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;
  retryAfter?: number;

  constructor(
    message: string,
    code: string,
    status: number,
    details: Record<string, unknown> = {},
    retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryAfter = retryAfter;
  }

  /**
   * Check if this is an authentication error (should redirect to login).
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if this is a rate limit error.
   */
  isRateLimited(): boolean {
    return this.status === 429;
  }

  /**
   * Check if this is a server error (can retry).
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Get user-friendly error message.
   */
  getUserMessage(): string {
    if (this.isRateLimited()) {
      const seconds = this.retryAfter || 60;
      return `Too many requests. Please try again in ${seconds} seconds.`;
    }
    if (this.isServerError()) {
      return 'Something went wrong. Please try again.';
    }
    return this.message;
  }
}

/**
 * Network error for offline/connection issues.
 */
export class NetworkError extends Error {
  constructor(message = 'Network error. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

class ApiClient {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch {
      // Network error (offline, DNS failure, etc.)
      throw new NetworkError();
    }

    // Parse response
    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response (likely server error)
      throw new ApiError(
        'Server returned an invalid response',
        'INVALID_RESPONSE',
        response.status
      );
    }

    // Handle error responses
    if (!response.ok || data.success === false) {
      const errorCode = data.error?.code || 'UNKNOWN_ERROR';
      const errorMessage = data.error?.message || 'An unexpected error occurred';
      const details = data.error?.details || {};

      // Extract retry-after header for rate limiting
      let retryAfter: number | undefined;
      if (response.status === 429) {
        const retryHeader = response.headers.get('Retry-After');
        retryAfter = retryHeader ? parseInt(retryHeader, 10) : 60;
      }

      throw new ApiError(errorMessage, errorCode, response.status, details, retryAfter);
    }

    return data;
  }

  // Analyses
  async createAnalysis(url: string) {
    return this.request<{ id: string; url: string; status: string }>('/api/v1/analyses', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async getAnalysis(id: string) {
    return this.request<{ id: string; url: string; status: string; error_message?: string }>(
      `/api/v1/analyses/${id}`
    );
  }

  async listAnalyses(limit = 20, offset = 0) {
    return this.request<Analysis[]>(`/api/v1/analyses?limit=${limit}&offset=${offset}`);
  }

  // Reports
  async getReport(id: string) {
    return this.request<Report>(`/api/v1/reports/${id}`);
  }

  async getReportByAnalysis(analysisId: string) {
    return this.request<Report>(`/api/v1/reports/by-analysis/${analysisId}`);
  }

  async listReports(limit = 20, offset = 0) {
    return this.request<ReportListItem[]>(`/api/v1/reports?limit=${limit}&offset=${offset}`);
  }

  // PDF Export
  async downloadReportPdf(reportId: string): Promise<Blob> {
    const response = await fetch(`${API_URL}/api/v1/reports/${reportId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    if (!response.ok) {
      if (response.status === 403) {
        throw new ApiError('PDF export requires Pro plan', 'PLAN_REQUIRED', 403);
      }
      throw new ApiError('Failed to download PDF', 'PDF_ERROR', response.status);
    }
    return response.blob();
  }

  // Billing
  async createCheckout(priceId: string) {
    return this.request<{ url: string }>('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ price_id: priceId }),
    });
  }

  async createPortalSession() {
    return this.request<{ url: string }>('/api/v1/billing/portal', {
      method: 'POST',
    });
  }

  async getBillingStatus() {
    return this.request<BillingStatus>('/api/v1/billing/status');
  }
}

export const apiClient = new ApiClient();
