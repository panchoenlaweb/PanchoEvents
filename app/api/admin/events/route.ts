import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { sanitizeString, slugify } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const title = sanitizeString(String(body.title ?? ''));

    if (!title) {
      return NextResponse.json({ error: 'Título requerido' }, { status: 400 });
    }

    // Auto-generate slug if not provided
    const slug = body.slug ? sanitizeString(String(body.slug)) : slugify(title);

    const { data, error } = await supabase
      .from('events')
      .insert({
        title,
        description: body.description ? String(body.description).substring(0, 2000) : null,
        event_date: body.event_date || null,
        thumbnail_url: body.thumbnail_url ? String(body.thumbnail_url).substring(0, 500) : null,
        stream_url: body.stream_url ? String(body.stream_url).substring(0, 500) : null,
        status: body.status === 'inactive' ? 'inactive' : 'active',
        slug,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El slug ya existe' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[events POST]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
