import { NextRequest, NextResponse } from 'next/server';
import {
  refreshSession,
  createJWT,
  buildSessionCookie,
  REFRESH_COOKIE_NAME,
} from '@/lib/auth';

// Called by middleware when the access token is expired but a refresh token exists.
// Silently refreshes and redirects back to the original destination.
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get('to') ?? '/dashboard';
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login?reason=expired', req.url));
  }

  const result = await refreshSession(refreshToken);

  if (!result) {
    const res = NextResponse.redirect(new URL('/login?reason=expired', req.url));
    res.cookies.delete(REFRESH_COOKIE_NAME);
    return res;
  }

  const jwt    = await createJWT(result.payload);
  const access = buildSessionCookie(jwt);

  const destination = new URL(to, req.url);
  const response = NextResponse.redirect(destination);
  response.cookies.set(access.name, access.value, access.options);
  return response;
}
