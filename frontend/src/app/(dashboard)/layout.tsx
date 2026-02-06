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

  const isAdmin = user.email === 'altidigitech@gmail.com';

  const planColors = {
    free: 'from-slate-600 to-slate-700',
    pro: 'from-primary-600 to-primary-700',
    agency: 'from-purple-600 to-purple-700',
  };

  const planColor = planColors[profile?.plan as keyof typeof planColors] || planColors.free;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-primary-500/20">
              LD
            </span>
            <span className="text-lg font-semibold text-white">Leak Detector</span>
          </Link>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
              {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
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
          <NavLink href="/billing" icon="💳">
            Billing
          </NavLink>
          {isAdmin && (
            <NavLink href="/admin" icon="🛡️">
              Admin
            </NavLink>
          )}
        </nav>

        {/* Settings */}
        <div className="p-4 border-t border-slate-800">
          <NavLink href="/settings" icon="⚙️">
            Settings
          </NavLink>
        </div>

        {/* Plan info */}
        <div className="p-4 border-t border-slate-800">
          <Link href="/billing" className="block">
            <div className={`p-4 bg-gradient-to-br ${planColor} rounded-xl hover:brightness-110 transition-all cursor-pointer group`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/70 uppercase font-medium tracking-wider">Current Plan</p>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full text-white capitalize">
                  {profile?.plan || 'free'}
                </span>
              </div>
              <p className="text-white font-semibold mb-3">
                {profile?.analyses_used || 0} / {profile?.analyses_limit || 3} analyses
              </p>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((profile?.analyses_used || 0) / (profile?.analyses_limit || 3)) * 100)}%`,
                  }}
                />
              </div>
              {profile?.plan === 'free' && (
                <span className="block text-center text-sm bg-white text-slate-900 py-2 px-4 rounded-lg font-medium hover:bg-white/90 transition-colors">
                  Upgrade Plan
                </span>
              )}
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                Manage billing
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
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
      className="nav-link group"
    >
      <span className="text-lg group-hover:scale-110 transition-transform">{icon}</span>
      <span>{children}</span>
    </Link>
  );
}
