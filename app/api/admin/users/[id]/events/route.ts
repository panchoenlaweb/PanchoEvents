import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

type Params = { params: { id: string } };

type PaymentRow = {
  event_id: string;
  payment_status?: string;
  payment_amount?: number | null;
  payment_method?: string | null;
};

// GET: list events assigned to user (includes payment info)
export async function GET(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_events')
    .select('event_id, assigned_at, payment_status, payment_amount, payment_method, events(id, title, slug, status, event_date)')
    .eq('user_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// POST body: { assignments: PaymentRow[] } — upserts assignments, deletes removed ones
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();

  // Support legacy { eventIds: string[] } and new { assignments: PaymentRow[] }
  let assignments: PaymentRow[] = [];
  if (Array.isArray(body.assignments)) {
    assignments = body.assignments;
  } else if (Array.isArray(body.eventIds)) {
    assignments = body.eventIds.map((eid: string) => ({ event_id: eid }));
  }

  const incomingIds = assignments.map((a) => a.event_id);

  // Delete assignments not in the new list
  await supabase.from('user_events').delete().eq('user_id', params.id)
    .not('event_id', 'in', incomingIds.length > 0 ? `(${incomingIds.map(id => `"${id}"`).join(',')})` : '("__none__")');

  if (assignments.length > 0) {
    const rows = assignments.map((a) => ({
      user_id: params.id,
      event_id: a.event_id,
      payment_status: a.payment_status ?? 'pending',
      payment_amount: a.payment_amount ?? null,
      payment_method: a.payment_method ?? null,
    }));
    const { error } = await supabase.from('user_events').upsert(rows, { onConflict: 'user_id,event_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Eventos asignados correctamente' });
}
