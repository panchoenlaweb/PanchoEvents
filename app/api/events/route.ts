import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// Returns only the events assigned to the authenticated user
export async function GET(req: NextRequest) {
  const payload = await requireAuth(req);
  if (!payload) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_events')
    .select('assigned_at, events(id, title, description, event_date, thumbnail_url, stream_url, status, slug)')
    .eq('user_id', payload.userId)
    .eq('events.status', 'active');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten the nested structure
  const events = (data ?? [])
    .map((row: Record<string, unknown>) => {
      const ev = row.events as Record<string, unknown> | null;
      if (!ev) return null;
      return { ...ev, assigned_at: row.assigned_at };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ra = a as Record<string, unknown>;
      const rb = b as Record<string, unknown>;
      const da = ra.event_date ? new Date(ra.event_date as string).getTime() : Infinity;
      const db = rb.event_date ? new Date(rb.event_date as string).getTime() : Infinity;
      return da - db;
    });

  return NextResponse.json({ data: events });
}
