import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check for a small flag cookie set after login
  // The full Supabase session cookie (~4500 bytes) exceeds the 4096-byte
  // browser limit for cookies sent in HTTP headers, so the server never sees it.
  // This tiny flag cookie is guaranteed to be sent.
  const isAuthenticated = request.cookies.get('auth-status')?.value === '1';

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
