import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ErrorState } from '@/components/shared/error-state';
import type { ReportCategory, ReportIssue } from '@/types';

interface PageProps {
  params: { id: string };
}

export default async function ReportPage({ params }: PageProps) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get report with analysis
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*, analyses!inner(url, user_id)')
      .eq('id', params.id)
      .eq('analyses.user_id', user?.id)
      .single();

    if (reportError) throw reportError;

    if (!report) {
      notFound();
    }

    const categories: ReportCategory[] = report.categories || [];
  const criticalIssues = categories.flatMap((c: ReportCategory) =>
    c.issues?.filter((i: ReportIssue) => i.severity === 'critical') || []
  );
  const warningIssues = categories.flatMap((c: ReportCategory) =>
    c.issues?.filter((i: ReportIssue) => i.severity === 'warning') || []
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/reports" className="text-primary-600 hover:underline text-sm mb-4 inline-block">
          ← Back to reports
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Analysis Report</h1>
            <p className="text-gray-600 truncate max-w-lg">{report.analyses?.url}</p>
            <p className="text-sm text-gray-500 mt-1">
              Analyzed on{' '}
              {new Date(report.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <ScoreCircle score={report.score} />
        </div>
      </div>

      {/* Summary */}
      <div className="card mb-6">
        <h2 className="font-semibold text-lg mb-2">Summary</h2>
        <p className="text-gray-700">{report.summary}</p>

        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-sm text-gray-600">
              {criticalIssues.length} critical issues
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-sm text-gray-600">
              {warningIssues.length} warnings
            </span>
          </div>
        </div>
      </div>

      {/* Screenshot */}
      {report.screenshot_url && (
        <div className="card mb-6">
          <h2 className="font-semibold text-lg mb-4">Page Screenshot</h2>
          <div className="border rounded-lg overflow-hidden">
            <img
              src={report.screenshot_url}
              alt="Page screenshot"
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Category scores */}
      <div className="card mb-6">
        <h2 className="font-semibold text-lg mb-4">Category Scores</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {categories.map((category: ReportCategory) => (
            <div
              key={category.name}
              className="p-4 bg-gray-50 rounded-lg text-center"
            >
              <p className="text-sm text-gray-600 mb-1">{category.label || category.name}</p>
              <p
                className={`text-2xl font-bold ${
                  category.score >= 80
                    ? 'text-green-600'
                    : category.score >= 60
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {category.score}
              </p>
              <p className="text-xs text-gray-500">
                {category.issues?.length || 0} issues
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Issues by category */}
      <div className="space-y-6">
        {categories.map((category: ReportCategory) => (
          <div key={category.name} className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{category.label || category.name}</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  category.score >= 80
                    ? 'bg-green-100 text-green-700'
                    : category.score >= 60
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {category.score}/100
              </span>
            </div>

            {category.issues && category.issues.length > 0 ? (
              <div className="space-y-4">
                {category.issues.map((issue: ReportIssue, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      issue.severity === 'critical'
                        ? 'severity-critical'
                        : issue.severity === 'warning'
                        ? 'severity-warning'
                        : 'severity-info'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {issue.severity === 'critical'
                          ? '🔴'
                          : issue.severity === 'warning'
                          ? '🟡'
                          : '🔵'}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-medium">{issue.title}</h3>
                        <p className="text-sm mt-1 opacity-90">{issue.description}</p>
                        <div className="mt-3 p-3 bg-white bg-opacity-50 rounded border border-current border-opacity-20">
                          <p className="text-sm font-medium">💡 Recommendation</p>
                          <p className="text-sm mt-1">{issue.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                ✅ No issues found in this category
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/analyze" className="btn-primary">
          Analyze Another Page
        </Link>
        <Link href="/reports" className="btn-secondary">
          View All Reports
        </Link>
      </div>
    </div>
  );
  } catch (error) {
    return (
      <ErrorState
        title="Failed to load report"
        message="We couldn't load this report. Please try refreshing the page."
      />
    );
  }
}

function ScoreCircle({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="45"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx="48"
          cy="48"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={getColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${getColor(score)}`}>{score}</span>
        <span className="text-xs text-gray-500">/100</span>
      </div>
    </div>
  );
}
