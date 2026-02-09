import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/verify-2fa'];
  const pathname = request.nextUrl.pathname;

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_token')?.value;

  if (!token && !pathname.startsWith('/api/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.png$).*)',
  ],
};
