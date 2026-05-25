import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { sanitizeString } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, role, is_active, created_at, last_login')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const username = sanitizeString(String(body.username ?? ''));
    const email = body.email ? sanitizeString(String(body.email)) : null;
    const password = String(body.password ?? '');
    const role = body.role === 'admin' ? 'admin' : 'user';

    if (!username || password.length < 6) {
      return NextResponse.json(
        { error: 'Username requerido y contraseña mínimo 6 caracteres' },
        { status: 400 },
      );
    }

    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase
      .from('users')
      .insert({ username, email, password_hash: hash, role, is_active: true })
      .select('id, username, email, role, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'El usuario o email ya existe' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('[users POST]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
