import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { sanitizeString, slugify } from '@/lib/utils';

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = sanitizeString(String(body.title));
    if (body.description !== undefined) updates.description = body.description ? String(body.description).substring(0, 2000) : null;
    if (body.event_date !== undefined) updates.event_date = body.event_date || null;
    if (body.thumbnail_url !== undefined) updates.thumbnail_url = body.thumbnail_url ? String(body.thumbnail_url).substring(0, 500) : null;
    if (body.stream_url !== undefined) updates.stream_url = body.stream_url ? String(body.stream_url).substring(0, 500) : null;
    if (body.status !== undefined) updates.status = body.status === 'inactive' ? 'inactive' : 'active';
    if (body.slug !== undefined) updates.slug = sanitizeString(String(body.slug));
    else if (body.title !== undefined) updates.slug = slugify(String(body.title));

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 });
      throw error;
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[events PUT]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { error } = await supabase.from('events').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Evento eliminado' });
}
