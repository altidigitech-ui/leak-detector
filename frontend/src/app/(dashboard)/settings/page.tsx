'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');

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
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) {
      setMessage('Error saving changes');
    } else {
      setMessage('Changes saved!');
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
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setMessage('Error opening billing portal');
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

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

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
                <a href="/pricing" className="btn-primary w-full mt-4 block text-center">
                  Upgrade
                </a>
              </div>
              <div className="p-4 border rounded-lg border-primary-300 bg-primary-50">
                <h3 className="font-semibold">Agency</h3>
                <p className="text-2xl font-bold mt-1">€99<span className="text-sm font-normal text-gray-500">/month</span></p>
                <ul className="mt-3 space-y-1 text-sm text-gray-600">
                  <li>✓ 200 analyses/month</li>
                  <li>✓ White-label reports</li>
                  <li>✓ API access</li>
                </ul>
                <a href="/pricing" className="btn-primary w-full mt-4 block text-center">
                  Upgrade
                </a>
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
