import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ErrorState } from '@/components/shared/error-state';
import { PdfDownloadButton } from '@/components/pdf-download-button';
import { ReportViewTracker } from '@/components/report-view-tracker';
import type { Plan, ReportCategory, ReportIssue } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get report with analysis
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*, analyses!inner(url, user_id)')
      .eq('id', id)
      .eq('analyses.user_id', user?.id)
      .single();

    if (reportError) throw reportError;

    if (!report) {
      notFound();
    }

    // Fetch user profile to determine plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user?.id)
      .single();

    const userPlan: Plan = (profile?.plan as Plan) || 'free';

    const categories: ReportCategory[] = report.categories || [];
    const criticalIssues = categories.flatMap((c: ReportCategory) =>
      c.issues?.filter((i: ReportIssue) => i.severity === 'critical') || []
    );
    const warningIssues = categories.flatMap((c: ReportCategory) =>
      c.issues?.filter((i: ReportIssue) => i.severity === 'warning') || []
    );

    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <ReportViewTracker score={report.score} />
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            <span>←</span>
            <span>Back to reports</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Analysis Report</h1>
              <p className="text-gray-500 truncate text-lg">{report.analyses?.url}</p>
              <p className="text-sm text-gray-400 mt-2">
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

        {/* Summary Card */}
        <div className={`card mb-8 border-l-4 ${
          report.score >= 80 ? 'border-l-green-500' : report.score >= 60 ? 'border-l-amber-500' : 'border-l-red-500'
        }`}>
          <h2 className="font-semibold text-xl mb-3">Summary</h2>
          <p className="text-gray-700 text-lg leading-relaxed">{report.summary}</p>

          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full">
              <span className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-sm font-medium text-red-700">
                {criticalIssues.length} critical {criticalIssues.length === 1 ? 'issue' : 'issues'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full">
              <span className="w-3 h-3 bg-amber-500 rounded-full" />
              <span className="text-sm font-medium text-amber-700">
                {warningIssues.length} {warningIssues.length === 1 ? 'warning' : 'warnings'}
              </span>
            </div>
          </div>
        </div>

        {/* Screenshot */}
        {report.screenshot_url && (
          <div className="card mb-8">
            <h2 className="font-semibold text-xl mb-4">Page Screenshot</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <img
                src={report.screenshot_url}
                alt="Page screenshot"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Category Scores - Horizontal Bars */}
        <div className="card mb-8">
          <h2 className="font-semibold text-xl mb-6">Category Scores</h2>
          <div className="space-y-4">
            {categories.map((category: ReportCategory) => (
              <CategoryScoreBar key={category.name} category={category} />
            ))}
          </div>
        </div>

        {/* Issues by Category */}
        <div className="space-y-6">
          {categories.map((category: ReportCategory) => (
            <div key={category.name} className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-xl">{category.label || category.name}</h2>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    category.score >= 80
                      ? 'bg-green-100 text-green-700'
                      : category.score >= 60
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {category.score}/100
                </span>
              </div>

              {category.issues && category.issues.length > 0 ? (
                <div className="space-y-4">
                  {category.issues.map((issue: ReportIssue, index: number) => (
                    <IssueCard key={index} issue={issue} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-green-50 rounded-xl">
                  <span className="text-3xl mb-2 block">✅</span>
                  <p className="text-green-700 font-medium">No issues found in this category</p>
                  <p className="text-green-600 text-sm mt-1">Great job!</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/analyze" className="btn-primary text-center">
            Analyze Another Page
          </Link>
          <Link href="/reports" className="btn-secondary text-center">
            View All Reports
          </Link>
          <PdfDownloadButton reportId={report.id} userPlan={userPlan} />
        </div>
      </div>
    );
  } catch {
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
    if (score >= 80) return { text: 'text-green-600', stroke: '#22c55e' };
    if (score >= 60) return { text: 'text-amber-600', stroke: '#f59e0b' };
    return { text: 'text-red-600', stroke: '#ef4444' };
  };

  const colors = getColor(score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 flex-shrink-0">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="72"
          cy="72"
          r="54"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="10"
        />
        <circle
          cx="72"
          cy="72"
          r="54"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${colors.text}`}>{score}</span>
        <span className="text-gray-400 text-sm">/100</span>
      </div>
    </div>
  );
}

function CategoryScoreBar({ category }: { category: ReportCategory }) {
  const getBarColor = (score: number) => {
    if (score >= 80) return 'score-bar-fill-green';
    if (score >= 60) return 'score-bar-fill-yellow';
    return 'score-bar-fill-red';
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 flex-shrink-0">
        <span className="text-sm font-medium text-gray-700">{category.label || category.name}</span>
      </div>
      <div className="flex-1">
        <div className="score-bar">
          <div
            className={`score-bar-fill ${getBarColor(category.score)}`}
            style={{ width: `${category.score}%` }}
          />
        </div>
      </div>
      <div className="w-16 text-right">
        <span
          className={`text-sm font-semibold ${
            category.score >= 80
              ? 'text-green-600'
              : category.score >= 60
              ? 'text-amber-600'
              : 'text-red-600'
          }`}
        >
          {category.score}/100
        </span>
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: ReportIssue }) {
  const severityConfig = {
    critical: {
      container: 'severity-critical',
      icon: '🔴',
      label: 'Critical',
    },
    warning: {
      container: 'severity-warning',
      icon: '🟡',
      label: 'Warning',
    },
    info: {
      container: 'severity-info',
      icon: '🔵',
      label: 'Info',
    },
  };

  const config = severityConfig[issue.severity] || severityConfig.info;

  return (
    <div className={`p-5 rounded-xl ${config.container}`}>
      <div className="flex items-start gap-4">
        <span className="text-xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{issue.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 font-medium">
              {config.label}
            </span>
          </div>
          <p className="text-sm opacity-90 mb-4">{issue.description}</p>

          <div className="p-4 bg-white/60 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💡</span>
              <span className="font-semibold text-sm">Recommendation</span>
            </div>
            <p className="text-sm">{issue.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
