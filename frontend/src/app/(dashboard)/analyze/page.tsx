'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
      setStatus(null);
    }
  };

  const pollAnalysis = async (analysisId: string) => {
    const maxAttempts = 60; // 60 seconds max
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
      } catch (err) {
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
    scraping: 'Capturing page...',
    analyzing: 'AI analysis in progress...',
    finalizing: 'Generating report...',
    completed: 'Analysis complete!',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyze a Landing Page</h1>
      <p className="text-gray-600 mb-8">
        Enter a URL to get an instant AI-powered analysis of your landing page.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
              {error}
              {error.includes('Upgrade') && (
                <a href="/pricing" className="block mt-2 underline font-medium">
                  View pricing →
                </a>
              )}
            </div>
          )}

          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              Landing Page URL
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input text-lg"
              placeholder="https://example.com/landing"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 text-lg"
            disabled={loading || !url.trim()}
          >
            {loading ? 'Analyzing...' : '🔍 Analyze Page'}
          </button>
        </form>

        {/* Progress indicator */}
        {loading && status && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{statusMessages[status] || 'Processing...'}</span>
              <span className="text-gray-500">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <ProgressStep done={progress >= 20} active={status === 'validating'}>
                URL validated
              </ProgressStep>
              <ProgressStep done={progress >= 40} active={status === 'scraping'}>
                Page captured
              </ProgressStep>
              <ProgressStep done={progress >= 80} active={status === 'analyzing'}>
                AI analysis
              </ProgressStep>
              <ProgressStep done={progress >= 100} active={status === 'finalizing'}>
                Report generated
              </ProgressStep>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">💡 Tips for best results</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use the full URL including https://</li>
          <li>• Make sure the page is publicly accessible</li>
          <li>• Analysis takes 15-30 seconds on average</li>
        </ul>
      </div>
    </div>
  );
}

function ProgressStep({
  done,
  active,
  children,
}: {
  done: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
          done
            ? 'bg-green-500 text-white'
            : active
            ? 'bg-primary-500 text-white animate-pulse'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        {done ? '✓' : active ? '◐' : '○'}
      </span>
      <span className={done ? 'text-gray-900' : 'text-gray-500'}>{children}</span>
    </div>
  );
}
