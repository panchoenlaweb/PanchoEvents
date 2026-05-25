import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

type Params = { params: { id: string } };

// GET: list events assigned to user
export async function GET(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_events')
    .select('event_id, assigned_at, events(id, title, slug, status, event_date)')
    .eq('user_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// POST body: { eventIds: string[] } — replaces all assignments
export async function POST(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const eventIds: string[] = Array.isArray(body.eventIds) ? body.eventIds : [];

  // Replace all assignments atomically
  await supabase.from('user_events').delete().eq('user_id', params.id);

  if (eventIds.length > 0) {
    const rows = eventIds.map((eid) => ({ user_id: params.id, event_id: eid }));
    const { error } = await supabase.from('user_events').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Eventos asignados correctamente' });
}
