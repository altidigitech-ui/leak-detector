import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get profile for plan info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-primary-600">
            🔍 Leak Detector
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" icon="📊">
            Dashboard
          </NavLink>
          <NavLink href="/analyze" icon="🔍">
            Analyze
          </NavLink>
          <NavLink href="/reports" icon="📋">
            Reports
          </NavLink>
        </nav>

        <div className="p-4 border-t">
          <NavLink href="/settings" icon="⚙️">
            Settings
          </NavLink>
        </div>

        {/* Plan info */}
        <div className="p-4 border-t">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase font-medium">Current Plan</p>
            <p className="font-semibold capitalize">{profile?.plan || 'free'}</p>
            <p className="text-sm text-gray-600">
              {profile?.analyses_used || 0} / {profile?.analyses_limit || 3} analyses
            </p>
            {profile?.plan === 'free' && (
              <Link
                href="/pricing"
                className="mt-2 block text-center text-sm bg-primary-600 text-white py-1 px-3 rounded hover:bg-primary-700"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
    >
      <span>{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
