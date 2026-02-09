'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function PricingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  const handleCheckout = async (priceId: string) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Not logged in, redirect to register
      window.location.href = `/register?plan=${priceId.replace('price_', '').replace('_monthly', '')}`;
      return;
    }

    // Logged in, start checkout
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ price_id: priceId }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '0',
      period: 'forever',
      description: 'Perfect to get started',
      features: [
        '3 analyses per month',
        'Score & issue detection',
        'Category breakdown',
        'Email support',
      ],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '29',
      period: 'per month',
      description: 'For growing businesses',
      features: [
        '50 analyses per month',
        'Full detailed recommendations',
        'PDF export',
        'Unlimited history',
        'Priority support',
      ],
      cta: 'Start Pro',
      highlighted: true,
    },
    {
      name: 'Agency',
      price: '99',
      period: 'per month',
      description: 'For teams and agencies',
      features: [
        '200 analyses per month',
        'Full detailed recommendations',
        'PDF export',
        'Unlimited history',
        'Dedicated support',
      ],
      cta: 'Start Agency',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-primary-600">
            Leak Detector
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Pricing */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your needs. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card ${
                  plan.highlighted
                    ? 'border-2 border-primary-500 shadow-lg relative'
                    : ''
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                )}

                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
                  <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">&euro;{plan.price}</span>
                    <span className="text-gray-500 ml-1">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="text-green-500">&check;</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.name === 'Free' ? (
                  <Link
                    href="/register"
                    className="block text-center py-3 rounded-lg font-medium transition-colors bg-gray-100 text-gray-900 hover:bg-gray-200"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.name === 'Pro' ? 'price_pro_monthly' : 'price_agency_monthly')}
                    className={`block w-full text-center py-3 rounded-lg font-medium transition-colors ${
                      plan.highlighted
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'How does the analysis work?',
                a: 'We capture your landing page, analyze it using AI, and identify conversion issues across 8 key categories including headlines, CTAs, social proof, and more.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! You can cancel your subscription at any time. Your access will continue until the end of your billing period.',
              },
              {
                q: 'Do unused analyses roll over?',
                a: 'No, analyses reset at the beginning of each billing cycle and do not roll over to the next month.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.',
              },
              {
                q: 'Is there a free trial for paid plans?',
                a: 'Our Free plan lets you test the product with 3 analyses per month. You can upgrade whenever you need more.',
              },
            ].map((faq) => (
              <div key={faq.q} className="border-b pb-6">
                <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to improve your conversion rate?
          </h2>
          <p className="text-primary-100 text-xl mb-8">
            Start with 3 free analyses. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2026 Leak Detector. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
