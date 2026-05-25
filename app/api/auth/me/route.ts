import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const payload = await requireAuth(req);

  if (!payload) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
    },
  });
}
