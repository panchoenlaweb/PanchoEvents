import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_events')
    .select('assigned_at, payment_status, payment_amount, payment_method, users(id, username, email)')
    .eq('event_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const flat = (data ?? []).map((row) => {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      username: (u as Record<string, unknown>)?.username ?? '—',
      email: (u as Record<string, unknown>)?.email ?? '—',
      payment_status: row.payment_status ?? 'pending',
      payment_amount: row.payment_amount ?? '',
      payment_method: row.payment_method ?? '',
      assigned_at: row.assigned_at,
    };
  });

  return NextResponse.json({ data: flat });
}
