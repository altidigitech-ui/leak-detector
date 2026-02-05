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
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 mt-1">View all your landing page analyses</p>
          </div>
          <Link href="/analyze" className="btn-primary flex items-center gap-2">
            <span className="text-lg">+</span>
            <span>New Analysis</span>
          </Link>
        </div>

        {reports && reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/reports/${report.id}`}
                className="card-interactive p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-semibold text-gray-900 truncate text-lg">
                      {report.analyses?.url}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatRelativeTime(new Date(report.created_at))}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <ScoreIndicator score={report.score} />
                    <span className="text-gray-300 text-xl">→</span>
                  </div>
                </div>

                <p className="mt-4 text-gray-600 line-clamp-2">{report.summary}</p>

                {/* Category scores preview */}
                <div className="mt-4 flex gap-2 flex-wrap">
                  {report.categories?.slice(0, 4).map((cat: ReportCategory) => (
                    <span
                      key={cat.name}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                        cat.score >= 80
                          ? 'bg-green-100 text-green-700'
                          : cat.score >= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {cat.label || cat.name}: {cat.score}
                    </span>
                  ))}
                  {report.categories?.length > 4 && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      +{report.categories.length - 4} more
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No reports yet</h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Run your first analysis to see your reports here.
            </p>
            <Link href="/analyze" className="btn-primary">
              Run Your First Analysis
            </Link>
          </div>
        )}
      </div>
    );
  } catch {
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
    if (score >= 80) return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' };
    if (score >= 60) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' };
  };

  const colors = getColor(score);

  return (
    <div
      className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center ${colors.bg} ${colors.border}`}
    >
      <span className={`text-xl font-bold ${colors.text}`}>{score}</span>
      <span className="text-xs text-gray-400">/100</span>
    </div>
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
