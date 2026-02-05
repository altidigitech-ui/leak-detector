import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ErrorState } from '@/components/shared/error-state';

export default async function DashboardPage() {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (profileError) throw profileError;

    // Get recent analyses
    const { data: analyses, error: analysesError } = await supabase
      .from('analyses')
      .select('*, reports(*)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (analysesError) throw analysesError;

    // Calculate average score
    const completedAnalyses = analyses?.filter((a) => a.status === 'completed') || [];
    const avgScore =
      completedAnalyses.length > 0
        ? Math.round(
            completedAnalyses.reduce((sum, a) => sum + (a.reports?.[0]?.score || 0), 0) /
              completedAnalyses.length
          )
        : null;

    const getScoreColor = (score: number | null) => {
      if (score === null) return 'text-gray-400';
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-amber-600';
      return 'text-red-600';
    };

    return (
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-gray-500 mt-1">Here's an overview of your landing page analyses</p>
          </div>
          <Link href="/analyze" className="btn-primary flex items-center gap-2">
            <span className="text-lg">+</span>
            <span>New Analysis</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Total Analyses */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Analyses</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">{analyses?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {completedAnalyses.length} completed, {(analyses?.length || 0) - completedAnalyses.length} in progress
            </p>
          </div>

          {/* Average Score */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Average Score</p>
                <p className={`text-4xl font-bold mt-2 ${getScoreColor(avgScore)}`}>
                  {avgScore !== null ? avgScore : '—'}
                  {avgScore !== null && <span className="text-lg text-gray-400">/100</span>}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {avgScore !== null
                ? avgScore >= 80 ? 'Great performance!' : avgScore >= 60 ? 'Room for improvement' : 'Needs attention'
                : 'Run your first analysis'}
            </p>
          </div>

          {/* Monthly Usage */}
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">This Month</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">
                  {profile?.analyses_used || 0}
                  <span className="text-lg text-gray-400">/{profile?.analyses_limit || 3}</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, ((profile?.analyses_used || 0) / (profile?.analyses_limit || 3)) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {(profile?.analyses_limit || 3) - (profile?.analyses_used || 0)} analyses remaining
              </p>
            </div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Analyses</h2>
            {analyses && analyses.length > 0 && (
              <Link href="/reports" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all →
              </Link>
            )}
          </div>

          {analyses && analyses.length > 0 ? (
            <div className="space-y-3">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-medium text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {analysis.url}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatRelativeTime(new Date(analysis.created_at))}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {analysis.status === 'completed' && analysis.reports?.[0] && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(analysis.reports[0].score)}`}>
                          {analysis.reports[0].score}
                        </div>
                        <p className="text-xs text-gray-500">Score</p>
                      </div>
                    )}

                    <StatusBadge status={analysis.status} />

                    {analysis.status === 'completed' && analysis.reports?.[0] && (
                      <Link
                        href={`/reports/${analysis.reports[0].id}`}
                        className="btn-secondary text-sm py-2"
                      >
                        View Report
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No analyses yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Run your first landing page analysis to see how you can improve your conversion rate.
              </p>
              <Link href="/analyze" className="btn-primary">
                Run Your First Analysis
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  } catch {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="We couldn't load your dashboard data. Please try refreshing the page."
      />
    );
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
  };

  const icons = {
    pending: '⏳',
    processing: '⚡',
    completed: '✓',
    failed: '✕',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      <span>{icons[status as keyof typeof icons] || icons.pending}</span>
      <span className="capitalize">{status}</span>
    </span>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
