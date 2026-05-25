import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('user_events')
    .select('assigned_at, events(id, title, description, event_date, thumbnail_url, stream_url, status, slug)')
    .eq('user_id', user.userId)
    .eq('events.status', 'active');

  const events = (rows ?? [])
    .map((row) => {
      const ev = (row as Record<string, unknown>).events as Record<string, unknown> | null;
      if (!ev) return null;
      return { ...ev, assigned_at: (row as Record<string, unknown>).assigned_at };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const ra = a as Record<string, unknown>;
      const rb = b as Record<string, unknown>;
      const da = ra.event_date ? new Date(ra.event_date as string).getTime() : Infinity;
      const db = rb.event_date ? new Date(rb.event_date as string).getTime() : Infinity;
      return da - db;
    });

  return <DashboardClient user={user} events={events as Record<string, unknown>[]} />;
}
