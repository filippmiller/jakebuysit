import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Get admin token from cookie or header
  const token = request.cookies.get('admin_token')?.value;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/api/auth/login'];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // If no token and not a public route, redirect to login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // TODO: Verify JWT token validity
  // TODO: Check 2FA status
  // TODO: Verify IP whitelist

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
