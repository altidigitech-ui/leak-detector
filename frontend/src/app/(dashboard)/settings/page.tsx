'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Plan & Billing</h2>
          <Link href="/billing" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Manage &rarr;
          </Link>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium capitalize">{profile?.plan} Plan</span>
            <span className="text-sm text-gray-600">
              {profile?.analyses_used} / {profile?.analyses_limit} analyses
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

          {profile?.plan === 'free' && (
            <Link
              href="/billing"
              className="mt-4 block text-center bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Upgrade Plan
            </Link>
          )}
        </div>
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
