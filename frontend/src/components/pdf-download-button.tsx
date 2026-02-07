'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, ApiError } from '@/lib/api';
import type { Plan } from '@/types';

interface PdfDownloadButtonProps {
  reportId: string;
  userPlan: Plan;
}

export function PdfDownloadButton({ reportId, userPlan }: PdfDownloadButtonProps) {
  const { session } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaidPlan = userPlan === 'pro' || userPlan === 'agency';

  if (!isPaidPlan) {
    return (
      <Link
        href="/settings"
        className="btn-secondary text-center text-sm"
        title="Upgrade to Pro to export PDF"
      >
        Upgrade to Pro to export PDF
      </Link>
    );
  }

  const handleDownload = async () => {
    if (!session?.access_token) return;

    setDownloading(true);
    setError(null);

    try {
      apiClient.setAccessToken(session.access_token);
      const blob = await apiClient.downloadReportPdf(reportId);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leak-detector-report-${reportId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('PDF export requires a Pro plan.');
      } else {
        setError('Failed to download PDF. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="btn-secondary text-center"
      >
        {downloading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating PDF...
          </span>
        ) : (
          'Download PDF'
        )}
      </button>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
