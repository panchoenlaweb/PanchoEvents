import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'pe_session';

interface TokenPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  sessionToken: string;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

async function isSessionActive(userId: string, sessionToken: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return true; // fail-open if env missing

  try {
    const now = new Date().toISOString();
    const url =
      `${supabaseUrl}/rest/v1/sessions` +
      `?user_id=eq.${userId}` +
      `&session_token=eq.${sessionToken}` +
      `&expires_at=gt.${encodeURIComponent(now)}` +
      `&select=id&limit=1`;

    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store',
    });

    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return true; // fail-open on network error
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isProtectedDashboard = pathname.startsWith('/dashboard');
  const isProtectedAdmin = pathname.startsWith('/admin');
  const isProtected = isProtectedDashboard || isProtectedAdmin;

  if (!isProtected) return NextResponse.next();

  // No token → login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);

  // Invalid/expired JWT → login
  if (!payload) {
    const res = NextResponse.redirect(new URL('/login?reason=expired', request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Session revoked (another device logged in) → kick immediately
  const active = await isSessionActive(payload.userId, payload.sessionToken);
  if (!active) {
    const res = NextResponse.redirect(new URL('/login?reason=session_revoked', request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Non-admin trying to reach /admin → dashboard
  if (isProtectedAdmin && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Inject user info into request headers for server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-username', payload.username);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
