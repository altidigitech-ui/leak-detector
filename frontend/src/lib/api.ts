const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: Record<string, any>;
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

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
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
    return this.request<any[]>(`/api/v1/analyses?limit=${limit}&offset=${offset}`);
  }

  // Reports
  async getReport(id: string) {
    return this.request<any>(`/api/v1/reports/${id}`);
  }

  async getReportByAnalysis(analysisId: string) {
    return this.request<any>(`/api/v1/reports/by-analysis/${analysisId}`);
  }

  async listReports(limit = 20, offset = 0) {
    return this.request<any[]>(`/api/v1/reports?limit=${limit}&offset=${offset}`);
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
    return this.request<{
      plan: string;
      analyses_used: number;
      analyses_limit: number;
      subscription?: { status: string; current_period_end: string };
    }>('/api/v1/billing/status');
  }
}

export const apiClient = new ApiClient();
