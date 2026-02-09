'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export function ReportViewTracker({ score }: { score: number }) {
  useEffect(() => {
    analytics.reportViewed(score);
  }, [score]);

  return null;
}
