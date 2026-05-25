import { NextRequest, NextResponse } from 'next/server';
import {
  refreshSession,
  createJWT,
  buildSessionCookie,
  REFRESH_COOKIE_NAME,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const result = await refreshSession(refreshToken);

  if (!result) {
    const res = NextResponse.json({ error: 'Session expired or revoked' }, { status: 401 });
    res.cookies.delete(REFRESH_COOKIE_NAME);
    return res;
  }

  const jwt = await createJWT(result.payload);
  const access = buildSessionCookie(jwt);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(access.name, access.value, access.options);
  return response;
}
