import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // DEBUG ROUTE — hit /debug-auth in browser after login to see what cookies the server receives
  if (request.nextUrl.pathname === '/debug-auth') {
    const allCookies = request.cookies.getAll();
    return NextResponse.json({
      totalCookies: allCookies.length,
      cookieNames: allCookies.map((c) => c.name),
      cookies: allCookies.map((c) => ({
        name: c.name,
        valueLength: c.value.length,
        valuePreview: c.value.substring(0, 50),
      })),
      headers: {
        cookie: request.headers.get('cookie')?.substring(0, 200) || 'NO COOKIE HEADER',
      },
    });
  }

  // Check for auth — try both: flag cookie AND Supabase cookie
  const hasFlag = request.cookies.get('auth-status')?.value === '1';
  const allCookies = request.cookies.getAll();
  const hasSupabaseCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth-token')
  );
  const isAuthenticated = hasFlag || hasSupabaseCookie;

  const protectedRoutes = ['/dashboard', '/settings', '/analyze', '/reports'];
  const authRoutes = ['/login', '/register', '/forgot-password'];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
