import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'My SaaS',
    template: '%s | My SaaS',
  },
  description: 'Description of your SaaS product',
  keywords: ['saas', 'product', 'keywords'],
  authors: [{ name: 'Your Name' }],
  openGraph: {
    title: 'My SaaS',
    description: 'Description of your SaaS product',
    url: 'https://example.com',
    siteName: 'My SaaS',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My SaaS',
    description: 'Description of your SaaS product',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster 
          position="top-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
