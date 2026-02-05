'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  analyses_used: number;
  analyses_limit: number;
  stripe_customer_id: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) {
      toast({ type: 'error', message: 'Failed to save changes' });
    } else {
      toast({ type: 'success', message: 'Changes saved!' });
      setProfile({ ...profile, full_name: fullName });
    }
    setSaving(false);
  };

  const handleManageBilling = async () => {
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
        // If no Stripe customer exists, redirect to pricing to create one
        if (data.error?.code === 'STRIPE_ERROR') {
          toast({ type: 'info', message: 'Redirecting to manage your plan...' });
          router.push('/pricing');
          return;
        }
        throw new Error(data.error?.message || 'Failed to open billing portal');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast({ type: 'error', message: 'Error opening billing portal. Please try again.' });
    }
  };

  const handleUpgrade = async (priceId: 'price_pro_monthly' | 'price_agency_monthly') => {
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
    } catch (err) {
      toast({ type: 'error', message: 'Error starting checkout. Please try again.' });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Account */}
      <div className="card mb-6">
        <h2 className="font-semibold text-lg mb-4">Account</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="input bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="John Doe"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Plan & Billing */}
      <div className="card mb-6">
        <h2 className="font-semibold text-lg mb-4">Plan & Billing</h2>

        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium capitalize">{profile?.plan} Plan</span>
            <span className="text-sm text-gray-600">
              {profile?.analyses_used} / {profile?.analyses_limit} analyses this month
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full"
              style={{
                width: `${Math.min(100, ((profile?.analyses_used || 0) / (profile?.analyses_limit || 3)) * 100)}%`,
              }}
            />
          </div>
        </div>

        {profile?.plan === 'free' ? (
          <div className="space-y-3">
            <p className="text-gray-600">Upgrade to get more analyses and features.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold">Pro</h3>
                <p className="text-2xl font-bold mt-1">€29<span className="text-sm font-normal text-gray-500">/month</span></p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ 50 analyses/month</li>
                  <li>✓ Unlimited history</li>
                  <li>✓ PDF export</li>
                </ul>
                <button onClick={() => handleUpgrade('price_pro_monthly')} className="btn-primary w-full mt-4">
                  Upgrade to Pro
                </button>
              </div>
              <div className="p-4 border rounded-lg border-primary-300 bg-primary-50">
                <h3 className="font-semibold">Agency</h3>
                <p className="text-2xl font-bold mt-1">€99<span className="text-sm font-normal text-gray-500">/month</span></p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ 200 analyses/month</li>
                  <li>✓ White-label reports</li>
                  <li>✓ API access</li>
                </ul>
                <button onClick={() => handleUpgrade('price_agency_monthly')} className="btn-primary w-full mt-4">
                  Upgrade to Agency
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={handleManageBilling} className="btn-secondary">
            Manage Subscription
          </button>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <h2 className="font-semibold text-lg mb-4 text-red-600">Danger Zone</h2>
        <p className="text-gray-600 mb-4">
          Once you sign out, you'll need to log in again to access your account.
        </p>
        <button onClick={handleSignOut} className="btn-secondary text-red-600 border-red-300 hover:bg-red-50">
          Sign Out
        </button>
      </div>
    </div>
  );
}
