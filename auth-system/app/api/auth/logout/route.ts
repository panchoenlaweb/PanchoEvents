import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, deleteSession, COOKIE_NAME } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getClientIp } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const payload = await requireAuth(req);

  if (payload) {
    await deleteSession(payload.userId);
    await supabase.from('access_logs').insert({
      user_id: payload.userId,
      username: payload.username,
      event_type: 'logout',
      ip_address: getClientIp(req),
      user_agent: req.headers.get('user-agent') ?? null,
    });
  }

  const response = NextResponse.json({ message: 'Sesión cerrada' });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}
