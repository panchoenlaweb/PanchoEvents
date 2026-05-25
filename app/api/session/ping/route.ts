import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Update last_ping so admin can see device is still active
  await supabase
    .from('sessions')
    .update({ last_ping: new Date().toISOString() })
    .eq('user_id', user.userId)
    .eq('session_token', user.sessionToken);

  return NextResponse.json({ ok: true });
}
