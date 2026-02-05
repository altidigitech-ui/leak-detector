'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AnalyzePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const networkErrorCount = useRef(0);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStatus('validating');
    setProgress(10);

    try {
      // Validate URL
      let validUrl = url.trim();
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = `https://${validUrl}`;
      }

      try {
        new URL(validUrl);
      } catch {
        setError('Please enter a valid URL');
        setLoading(false);
        setStatus(null);
        return;
      }

      setStatus('submitting');
      setProgress(20);

      // Create analysis via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ url: validUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === 'QUOTA_EXCEEDED') {
          setError('Monthly analysis limit reached. Upgrade to continue.');
        } else {
          setError(data.error?.message || 'Failed to start analysis');
        }
        setLoading(false);
        setStatus(null);
        return;
      }

      const analysisId = data.data.id;
      setStatus('analyzing');
      setProgress(40);

      // Poll for completion
      await pollAnalysis(analysisId);
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
      setStatus(null);
    }
  };

  const pollAnalysis = async (analysisId: string) => {
    const maxAttempts = 240; // 240 seconds (4 minutes) max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      // Update progress
      setProgress(40 + Math.min(50, attempts));

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/analyses/${analysisId}`,
          {
            headers: {
              Authorization: `Bearer ${await getAccessToken()}`,
            },
          }
        );

        const data = await response.json();
        const analysis = data.data;

        if (analysis.status === 'completed') {
          setProgress(100);
          setStatus('completed');

          // Get report and redirect
          const reportResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/v1/reports/by-analysis/${analysisId}`,
            {
              headers: {
                Authorization: `Bearer ${await getAccessToken()}`,
              },
            }
          );
          const reportData = await reportResponse.json();

          setTimeout(() => {
            router.push(`/reports/${reportData.data.id}`);
          }, 500);
          return;
        }

        if (analysis.status === 'failed') {
          setError(analysis.error_message || 'Analysis failed');
          setLoading(false);
          setStatus(null);
          return;
        }

        // Update status message
        if (attempts < 10) {
          setStatus('scraping');
        } else if (attempts < 30) {
          setStatus('analyzing');
        } else {
          setStatus('finalizing');
        }
      } catch {
        // Show toast after 3 consecutive network errors
        networkErrorCount.current++;
        if (networkErrorCount.current === 3) {
          toast({ type: 'error', message: 'Network issue detected. Retrying...' });
        }
        // Continue polling
      }
    }
    // Reset error count after polling ends
    networkErrorCount.current = 0;

    setError('Analysis timed out. Please try again.');
    setLoading(false);
    setStatus(null);
  };

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  };

  const statusMessages: Record<string, string> = {
    validating: 'Validating URL...',
    submitting: 'Starting analysis...',
    scraping: 'Capturing your page...',
    analyzing: 'AI is analyzing your page...',
    finalizing: 'Generating your report...',
    completed: 'Analysis complete!',
  };

  const statusDescriptions: Record<string, string> = {
    validating: 'Checking the URL format',
    submitting: 'Initializing the analysis engine',
    scraping: 'Taking a screenshot and extracting content',
    analyzing: 'Evaluating 8 conversion dimensions',
    finalizing: 'Creating your personalized report',
    completed: 'Redirecting to your report...',
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Analyze Your Landing Page</h1>
        <p className="text-gray-500 text-lg">
          Get AI-powered insights to boost your conversion rate in 60 seconds
        </p>
      </div>

      {/* Main Card */}
      <div className="card p-8">
        {!loading ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <div>
                    <p className="text-red-700 font-medium">{error}</p>
                    {error.includes('Upgrade') && (
                      <Link href="/pricing" className="text-red-600 hover:text-red-700 text-sm underline mt-1 inline-block">
                        View pricing plans →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Enter your landing page URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔗</span>
                </div>
                <input
                  id="url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input-lg pl-12 pr-4"
                  placeholder="https://yoursite.com/landing-page"
                  disabled={loading}
                  required
                  autoFocus
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                We'll analyze your page and provide actionable recommendations
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-4 text-lg font-semibold"
              disabled={loading || !url.trim()}
            >
              <span className="flex items-center justify-center gap-2">
                <span>🔍</span>
                <span>Start Analysis</span>
              </span>
            </button>
          </form>
        ) : (
          /* Progress State */
          <div className="py-4">
            {/* Animated loader */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-gray-200 rounded-full"></div>
                <div
                  className="absolute top-0 left-0 w-24 h-24 border-4 border-primary-500 rounded-full animate-spin"
                  style={{
                    borderTopColor: 'transparent',
                    borderRightColor: 'transparent',
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">{progress}%</span>
                </div>
              </div>
            </div>

            {/* Status text */}
            <div className="text-center mb-8">
              <p className="text-xl font-semibold text-gray-900 mb-1">
                {statusMessages[status || 'analyzing']}
              </p>
              <p className="text-gray-500">
                {statusDescriptions[status || 'analyzing']}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-4 gap-2">
              <ProgressStep
                done={progress >= 20}
                active={status === 'validating' || status === 'submitting'}
                label="Validate"
              />
              <ProgressStep
                done={progress >= 40}
                active={status === 'scraping'}
                label="Capture"
              />
              <ProgressStep
                done={progress >= 80}
                active={status === 'analyzing'}
                label="Analyze"
              />
              <ProgressStep
                done={progress >= 100}
                active={status === 'finalizing' || status === 'completed'}
                label="Report"
              />
            </div>

            {/* Analyzing URL */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">Analyzing</p>
              <p className="text-gray-900 font-medium truncate">{url}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tips - Only show when not loading */}
      {!loading && (
        <div className="mt-8 p-6 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl border border-primary-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Tips for best results</h3>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="text-primary-500">✓</span>
                  Use the full URL including https://
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-500">✓</span>
                  Make sure the page is publicly accessible
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-500">✓</span>
                  Analysis typically completes in 30-60 seconds
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressStep({
  done,
  active,
  label,
}: {
  done: boolean;
  active: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
          done
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-primary-500 text-white animate-pulse'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {done ? '✓' : active ? '●' : '○'}
      </div>
      <span className={`text-xs font-medium ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}
