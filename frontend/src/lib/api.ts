import { getClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, any>;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

/**
 * Get the current session token
 */
async function getToken(): Promise<string | null> {
  const supabase = getClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Build URL with query params
 */
function buildUrl(path: string, params?: Record<string, string | number>): string {
  const url = new URL(`${API_URL}/api/v1${path}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  return url.toString();
}

/**
 * Make an API request
 */
async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, params, headers = {} } = options;
  
  const token = await getToken();
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(buildUrl(path, params), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your connection.',
      },
    };
  }
}

/**
 * API client with typed methods
 */
export const api = {
  get: <T>(path: string, params?: Record<string, string | number>) =>
    request<T>(path, { method: 'GET', params }),
  
  post: <T>(path: string, body?: Record<string, any>) =>
    request<T>(path, { method: 'POST', body }),
  
  put: <T>(path: string, body?: Record<string, any>) =>
    request<T>(path, { method: 'PUT', body }),
  
  patch: <T>(path: string, body?: Record<string, any>) =>
    request<T>(path, { method: 'PATCH', body }),
  
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// ============================================================================
// Typed API functions for specific resources
// ============================================================================

// Profile
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: string;
  subscription_tier: string | null;
  credits_remaining: number;
  created_at: string;
}

export const profileApi = {
  get: () => api.get<Profile>('/profile'),
  update: (data: Partial<Profile>) => api.patch<Profile>('/profile', data),
};

// Add more typed API functions as needed for your features
// export const reportsApi = {
//   list: (params?: { page?: number; limit?: number; status?: string }) =>
//     api.get<Report[]>('/reports', params),
//   get: (id: string) => api.get<Report>(`/reports/${id}`),
//   create: (data: CreateReportInput) => api.post<Report>('/reports', data),
//   delete: (id: string) => api.delete(`/reports/${id}`),
// };
