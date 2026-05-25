import { redirect, notFound } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { StreamClient } from './StreamClient';

export default async function EventPage({ params }: { params: { id: string } }) {
  const user = await getServerUser();
  if (!user) redirect('/login');

  // Verify the user has access to this event
  const { data: access } = await supabase
    .from('user_events')
    .select('event_id')
    .eq('user_id', user.userId)
    .eq('event_id', params.id)
    .single();

  if (!access) notFound();

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single();

  if (!event) notFound();

  return <StreamClient user={user} event={event as Record<string, unknown>} />;
}
