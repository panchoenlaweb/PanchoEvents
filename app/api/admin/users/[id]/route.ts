import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { requireAdmin, deleteSession } from '@/lib/auth';
import { sanitizeString } from '@/lib/utils';

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, role, is_active, created_at, last_login, notes')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.username !== undefined) updates.username = sanitizeString(String(body.username));
    if (body.email !== undefined) updates.email = body.email ? sanitizeString(String(body.email)) : null;
    if (body.role !== undefined) updates.role = body.role === 'admin' ? 'admin' : 'user';
    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active);
      // Invalidate session if deactivating
      if (!body.is_active) await deleteSession(params.id);
    }
    if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).substring(0, 1000) : null;
    if (body.password) {
      if (String(body.password).length < 6) {
        return NextResponse.json({ error: 'Contraseña mínimo 6 caracteres' }, { status: 400 });
      }
      updates.password_hash = await bcrypt.hash(String(body.password), 12);
      // Force re-login after password change
      await deleteSession(params.id);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', params.id)
      .select('id, username, email, role, is_active, created_at, last_login, notes')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El usuario o email ya existe' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[users PUT]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Prevent admin from deleting themselves
  if (params.id === admin.userId) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
  }

  // Invalidate session first
  await deleteSession(params.id);

  const { error } = await supabase.from('users').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: 'Usuario eliminado' });
}
