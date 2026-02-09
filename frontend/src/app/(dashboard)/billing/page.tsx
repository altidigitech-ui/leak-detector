'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/analytics';

interface BillingData {
  plan: string;
  analyses_used: number;
  analyses_limit: number;
  stripe_customer_id: string | null;
  subscription: {
    status: string;
    current_period_end: string;
  } | null;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    analyses: 3,
    features: ['3 analyses per month', 'Basic report', 'Email support'],
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: 'month',
    analyses: 50,
    priceId: 'price_pro_monthly',
    features: ['50 analyses per month', 'Detailed reports', 'Unlimited history', 'PDF export', 'Priority support'],
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 99,
    period: 'month',
    analyses: 200,
    priceId: 'price_agency_monthly',
    features: ['200 analyses per month', 'Detailed reports', 'Unlimited history', 'PDF export', 'Dedicated support'],
    highlighted: false,
  },
];

export default function BillingPage() {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadBillingStatus();
  }, []);

  const loadBillingStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/status`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBilling(data.data);
      }
    } catch {
      toast({ type: 'error', message: 'Failed to load billing information' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    const plan = plans.find(p => p.priceId === priceId);
    if (plan) {
      analytics.checkoutInitiated(plan.id);
    }
    setActionLoading(priceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ price_id: priceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to start checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error starting checkout';
      toast({ type: 'error', message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading('portal');
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/billing/portal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error opening billing portal';
      toast({ type: 'error', message });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === billing?.plan) || plans[0];
  const usagePercent = billing ? Math.min(100, (billing.analyses_used / billing.analyses_limit) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">Manage your plan and payment details</p>
      </div>

      {/* Current Plan Card */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentPlan.id === 'free'
                  ? 'bg-gray-100 text-gray-700'
                  : currentPlan.id === 'pro'
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {currentPlan.name} Plan
              </span>
              {billing?.subscription?.status === 'active' && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  Active
                </span>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Monthly usage</span>
                <span className="font-medium">
                  {billing?.analyses_used || 0} / {billing?.analyses_limit || 3} analyses
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {billing?.subscription?.current_period_end && (
              <p className="text-sm text-gray-500">
                {billing.subscription.status === 'active' ? 'Renews' : 'Expires'} on{' '}
                {new Date(billing.subscription.current_period_end).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {billing?.plan !== 'free' && billing?.stripe_customer_id && (
              <button
                onClick={handleManageSubscription}
                disabled={actionLoading === 'portal'}
                className="btn-secondary"
              >
                {actionLoading === 'portal' ? 'Loading...' : 'Manage Subscription'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {billing?.plan === 'free' ? 'Upgrade Your Plan' : 'Available Plans'}
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === billing?.plan;
          const isDowngrade =
            (billing?.plan === 'agency' && plan.id !== 'agency') ||
            (billing?.plan === 'pro' && plan.id === 'free');

          return (
            <div
              key={plan.id}
              className={`card relative ${
                plan.highlighted && !isCurrent ? 'ring-2 ring-primary-500 shadow-lg' : ''
              } ${isCurrent ? 'ring-2 ring-green-500 bg-green-50/50' : ''}`}
            >
              {plan.highlighted && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Most Popular
                </span>
              )}

              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Current Plan
                </span>
              )}

              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-3">
                  <span className="text-4xl font-bold">€{plan.price}</span>
                  <span className="text-gray-500">/{plan.period}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">{plan.analyses} analyses/month</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">&#10003;</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-green-100 text-green-700 font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : plan.id === 'free' ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                >
                  {isDowngrade ? 'Contact Support to Downgrade' : 'Free Forever'}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.priceId!)}
                  disabled={actionLoading === plan.priceId}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    plan.highlighted
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {actionLoading === plan.priceId
                    ? 'Redirecting...'
                    : isDowngrade
                    ? 'Contact Support'
                    : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Methods / Invoice Section */}
      {billing?.stripe_customer_id && (
        <div className="card mt-8">
          <h3 className="font-semibold text-gray-900 mb-4">Payment & Invoices</h3>
          <p className="text-gray-600 text-sm mb-4">
            Manage your payment methods, view invoices, and update billing information through the Stripe portal.
          </p>
          <button
            onClick={handleManageSubscription}
            disabled={actionLoading === 'portal'}
            className="btn-secondary"
          >
            {actionLoading === 'portal' ? 'Loading...' : 'Open Billing Portal'}
          </button>
        </div>
      )}

      {/* FAQ */}
      <div className="card mt-8">
        <h3 className="font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-900">When will I be charged?</p>
            <p className="text-gray-600 mt-1">You&apos;ll be charged immediately when upgrading. Your billing cycle renews monthly from that date.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Can I cancel anytime?</p>
            <p className="text-gray-600 mt-1">Yes, you can cancel your subscription at any time. You&apos;ll keep access until the end of your billing period.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Do unused analyses roll over?</p>
            <p className="text-gray-600 mt-1">No, analyses reset at the beginning of each billing cycle.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
