import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

  // Get recent analyses
  const { data: analyses } = await supabase
    .from('analyses')
    .select('*, reports(*)')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Calculate average score
  const completedAnalyses = analyses?.filter((a) => a.status === 'completed') || [];
  const avgScore =
    completedAnalyses.length > 0
      ? Math.round(
          completedAnalyses.reduce((sum, a) => sum + (a.reports?.[0]?.score || 0), 0) /
            completedAnalyses.length
        )
      : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-gray-600">Here's an overview of your analyses</p>
        </div>
        <Link href="/analyze" className="btn-primary">
          + New Analysis
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500 uppercase font-medium">Total Analyses</p>
          <p className="text-3xl font-bold mt-1">{analyses?.length || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 uppercase font-medium">Average Score</p>
          <p className="text-3xl font-bold mt-1">
            {avgScore !== null ? `${avgScore}/100` : '-'}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 uppercase font-medium">This Month</p>
          <p className="text-3xl font-bold mt-1">
            {profile?.analyses_used || 0}/{profile?.analyses_limit || 3}
          </p>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  ((profile?.analyses_used || 0) / (profile?.analyses_limit || 3)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent analyses */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Analyses</h2>

        {analyses && analyses.length > 0 ? (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{analysis.url}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {analysis.status === 'completed' && analysis.reports?.[0] && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-600">
                        {analysis.reports[0].score}
                      </p>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                  )}

                  <StatusBadge status={analysis.status} />

                  {analysis.status === 'completed' && analysis.reports?.[0] && (
                    <Link
                      href={`/reports/${analysis.reports[0].id}`}
                      className="btn-secondary text-sm"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No analyses yet</p>
            <Link href="/analyze" className="btn-primary">
              Run Your First Analysis
            </Link>
          </div>
        )}

        {analyses && analyses.length > 0 && (
          <div className="mt-4 text-center">
            <Link href="/reports" className="text-primary-600 hover:underline text-sm">
              View all reports →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}
