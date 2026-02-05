import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for Leak Detector. Choose between Free, Pro (€29/month), or Agency (€99/month) plans.',
  openGraph: {
    title: 'Pricing — Leak Detector',
    description: 'Choose the plan that fits your needs. No hidden fees.',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
