import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/hooks/use-toast';
import { ToastContainer } from '@/components/ui/toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Leak Detector - Find Conversion Leaks in Your Landing Pages',
  description:
    'Identify in 30 seconds what makes visitors leave your landing page. Get actionable recommendations to improve your conversion rate.',
  keywords: ['landing page', 'conversion', 'CRO', 'optimization', 'analysis'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
