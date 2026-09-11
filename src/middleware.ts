import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public static assets and public endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/api/telemetry' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/cron')
  ) {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    return res;
  }

  // 2. Allow ESP32 device to call GET /api/commands with x-api-key without user session
  if (pathname === '/api/commands' && req.method === 'GET' && req.headers.get('x-api-key')) {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    return res;
  }

  // 3. Verify NextAuth JWT session for all other protected routes & APIs
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || 'dev_secret_key_sailboat_telemetry_2024_secure_hash_min_32_chars',
  });

  if (!token) {
    // For API requests, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For web page requests, redirect to /login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
}

function applySecurityHeaders(res: NextResponse) {
  // Content Security Policy
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
  );
  // Prevent clickjacking
  res.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME sniffing
  res.headers.set('X-Content-Type-Options', 'nosniff');
  // Referrer Policy
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restrict browser features
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Strict Transport Security (HSTS)
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
