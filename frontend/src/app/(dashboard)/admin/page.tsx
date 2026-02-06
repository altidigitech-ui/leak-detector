'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface UserMetrics {
  total_users: number;
  users_today: number;
  users_this_week: number;
  users_this_month: number;
  users_by_plan: { free: number; pro: number; agency: number };
}

interface AnalysisMetrics {
  total_analyses: number;
  analyses_today: number;
  analyses_this_week: number;
  analyses_this_month: number;
  success_rate: number;
  avg_score: number;
  analyses_by_status: { pending: number; processing: number; completed: number; failed: number };
}

interface RevenueMetrics {
  mrr: number;
  total_revenue: number;
  customers_pro: number;
  customers_agency: number;
  conversion_rate: number;
}

interface CostMetrics {
  estimated_monthly_cost: number;
  cost_breakdown: { claude_api: number; infrastructure: number };
  analyses_this_month: number;
  cost_per_analysis: number;
}

interface RecentUser {
  id: string;
  email: string;
  plan: string;
  analyses_used: number;
  created_at: string;
}

interface RecentAnalysis {
  id: string;
  url: string;
  status: string;
  score: number | null;
  user_email: string;
  created_at: string;
}

interface AdminDashboard {
  users: UserMetrics;
  analyses: AnalysisMetrics;
  revenue: RevenueMetrics;
  costs: CostMetrics;
  recent_users: RecentUser[];
  recent_analyses: RecentAnalysis[];
}

const ADMIN_EMAIL = 'altidigitech@gmail.com';

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const email = session.user.email;
      setUserEmail(email || null);

      if (email !== ADMIN_EMAIL) {
        setError('Access denied. Admin only.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const data = await response.json();
      setDashboard(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error loading dashboard';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-red-500 text-sm mt-2">Logged in as: {userEmail}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const { users, analyses, revenue, costs, recent_users, recent_analyses } = dashboard;

  const profit = revenue.mrr - costs.estimated_monthly_cost;
  const profitMargin = revenue.mrr > 0 ? (profit / revenue.mrr * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Real-time business metrics</p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* MRR */}
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-green-100 text-sm">MRR</p>
          <p className="text-3xl font-bold">&euro;{revenue.mrr}</p>
          <p className="text-green-100 text-xs mt-1">
            {revenue.customers_pro} Pro + {revenue.customers_agency} Agency
          </p>
        </div>

        {/* Users */}
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-blue-100 text-sm">Total Users</p>
          <p className="text-3xl font-bold">{users.total_users}</p>
          <p className="text-blue-100 text-xs mt-1">
            +{users.users_today} today
          </p>
        </div>

        {/* Analyses */}
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-purple-100 text-sm">Total Analyses</p>
          <p className="text-3xl font-bold">{analyses.total_analyses}</p>
          <p className="text-purple-100 text-xs mt-1">
            {analyses.success_rate}% success rate
          </p>
        </div>

        {/* Profit */}
        <div className={`card bg-gradient-to-br ${profit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} text-white`}>
          <p className="text-white/80 text-sm">Monthly Profit</p>
          <p className="text-3xl font-bold">&euro;{profit.toFixed(0)}</p>
          <p className="text-white/80 text-xs mt-1">
            {profitMargin.toFixed(1)}% margin
          </p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Users Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Users by Plan</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Free</span>
              <span className="font-medium">{users.users_by_plan.free}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pro (&euro;29)</span>
              <span className="font-medium text-blue-600">{users.users_by_plan.pro}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Agency (&euro;99)</span>
              <span className="font-medium text-purple-600">{users.users_by_plan.agency}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Conversion Rate</span>
              <span className="font-medium text-green-600">{revenue.conversion_rate}%</span>
            </div>
          </div>
        </div>

        {/* Analyses Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Analyses Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Completed
              </span>
              <span className="font-medium">{analyses.analyses_by_status.completed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Failed
              </span>
              <span className="font-medium">{analyses.analyses_by_status.failed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Processing
              </span>
              <span className="font-medium">{analyses.analyses_by_status.processing}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                Pending
              </span>
              <span className="font-medium">{analyses.analyses_by_status.pending}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Score</span>
              <span className="font-medium">{analyses.avg_score}/100</span>
            </div>
          </div>
        </div>

        {/* Costs Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Costs</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Claude API</span>
              <span className="font-medium">&euro;{costs.cost_breakdown.claude_api}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Infrastructure</span>
              <span className="font-medium">&euro;{costs.cost_breakdown.infrastructure}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total</span>
              <span className="font-bold text-red-600">&euro;{costs.estimated_monthly_cost}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Cost/analysis</span>
              <span className="text-gray-500">&euro;{costs.cost_per_analysis}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Time-based metrics */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* User Growth */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{users.users_today}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{users.users_this_week}</p>
              <p className="text-sm text-gray-500">This Week</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{users.users_this_month}</p>
              <p className="text-sm text-gray-500">This Month</p>
            </div>
          </div>
        </div>

        {/* Analysis Volume */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Analysis Volume</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{analyses.analyses_today}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{analyses.analyses_this_week}</p>
              <p className="text-sm text-gray-500">This Week</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{analyses.analyses_this_month}</p>
              <p className="text-sm text-gray-500">This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Used</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent_users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-2 truncate max-w-[150px]" title={user.email}>
                      {user.email}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        user.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                        user.plan === 'agency' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="py-2 text-gray-600">{user.analyses_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Analyses</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">URL</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent_analyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td className="py-2 truncate max-w-[150px]" title={analysis.url}>
                      {analysis.url}
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        analysis.status === 'completed' ? 'bg-green-100 text-green-700' :
                        analysis.status === 'failed' ? 'bg-red-100 text-red-700' :
                        analysis.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {analysis.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {analysis.score !== null ? (
                        <span className={`font-medium ${
                          analysis.score >= 70 ? 'text-green-600' :
                          analysis.score >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {analysis.score}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            setLoading(true);
            checkAdminAndLoad();
          }}
          className="btn-secondary"
        >
          Refresh Data
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
