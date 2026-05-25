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
