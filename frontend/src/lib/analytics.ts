// Plausible custom events
type PlausibleFn = (eventName: string, options?: { props: Record<string, string | number | boolean> }) => void;

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

export function trackEvent(eventName: string, props?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(eventName, props ? { props } : undefined);
  }
}

// Predefined events
export const analytics = {
  analysisStarted: (url: string) => trackEvent('Analysis Started', { url }),
  analysisCompleted: (url: string, score: number) => trackEvent('Analysis Completed', { url, score }),
  checkoutInitiated: (plan: string) => trackEvent('Checkout Initiated', { plan }),
  signupCompleted: (method: string) => trackEvent('Signup Completed', { method }),
  pdfDownloaded: () => trackEvent('PDF Downloaded'),
  reportViewed: (score: number) => trackEvent('Report Viewed', { score }),
};
