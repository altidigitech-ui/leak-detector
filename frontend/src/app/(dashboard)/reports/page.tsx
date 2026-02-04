import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ErrorState } from '@/components/shared/error-state';
import type { ReportCategory } from '@/types';

export default async function ReportsPage() {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get all reports with their analyses
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*, analyses!inner(url, user_id)')
      .eq('analyses.user_id', user?.id)
      .order('created_at', { ascending: false });

    if (reportsError) throw reportsError;

    return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">View all your landing page analyses</p>
        </div>
        <Link href="/analyze" className="btn-primary">
          + New Analysis
        </Link>
      </div>

      {reports && reports.length > 0 ? (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="card hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{report.analyses?.url}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(report.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <ScoreIndicator score={report.score} />
                  <span className="text-gray-400">→</span>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600 line-clamp-2">{report.summary}</p>

              {/* Category scores preview */}
              <div className="mt-4 flex gap-2 flex-wrap">
                {report.categories?.slice(0, 4).map((cat: ReportCategory) => (
                  <span
                    key={cat.name}
                    className={`text-xs px-2 py-1 rounded-full ${
                      cat.score >= 80
                        ? 'bg-green-100 text-green-700'
                        : cat.score >= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {cat.label || cat.name}: {cat.score}
                  </span>
                ))}
                {report.categories?.length > 4 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    +{report.categories.length - 4} more
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No reports yet</h2>
          <p className="text-gray-600 mb-6">
            Run your first analysis to see your reports here.
          </p>
          <Link href="/analyze" className="btn-primary">
            Run Your First Analysis
          </Link>
        </div>
      )}
    </div>
  );
  } catch (error) {
    return (
      <ErrorState
        title="Failed to load reports"
        message="We couldn't load your reports. Please try refreshing the page."
      />
    );
  }
}

function ScoreIndicator({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div
      className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center ${getColor(
        score
      )}`}
    >
      <span className="text-xl font-bold">{score}</span>
      <span className="text-xs opacity-75">/100</span>
    </div>
  );
}
