import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/hooks/use-toast';
import { ToastContainer } from '@/components/ui/toast';

export const metadata: Metadata = {
  metadataBase: new URL('https://leakdetector.tech'),
  title: {
    default: 'Leak Detector — Find What Makes Visitors Leave Your Page',
    template: '%s — Leak Detector',
  },
  description: 'AI-powered landing page analysis. Identify conversion leaks and get actionable recommendations in 60 seconds.',
  keywords: ['landing page', 'conversion', 'CRO', 'optimization', 'analysis', 'AI'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://leakdetector.tech',
    siteName: 'Leak Detector',
    title: 'Leak Detector — Find What Makes Visitors Leave Your Page',
    description: 'AI-powered landing page analysis. Get actionable recommendations in 60 seconds.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leak Detector',
    description: 'AI-powered landing page analysis. Get actionable recommendations in 60 seconds.',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased">
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
