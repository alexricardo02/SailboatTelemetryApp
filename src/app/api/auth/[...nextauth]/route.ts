import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { authLimiter } from '@/lib/ratelimit';
import { getIpFromRequest } from '@/lib/utils';
import { logSecurityEvent } from '@/lib/logger';

const handler = NextAuth(authOptions);

export async function POST(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const ip = getIpFromRequest(req);

  // Check if this is a sign-in callback attempt to rate-limit brute-force attacks
  if (req.nextUrl.pathname.includes('/callback/credentials')) {
    const rateResult = await authLimiter(`login_attempt:${ip}`);
    if (!rateResult.success) {
      logSecurityEvent({
        type: 'rate_limit_hit',
        ip,
        path: '/api/auth/callback/credentials',
        reason: 'login_brute_force_prevented',
        resetAt: new Date(rateResult.reset).toISOString(),
      });
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateResult.reset - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  return handler(req, ctx);
}

export async function GET(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  return handler(req, ctx);
}
