import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { sanitizeString } from '@/lib/utils';

// One-time endpoint: creates the first admin account.
// Protected by ADMIN_SETUP_SECRET env var.
// Disabled automatically once any admin exists.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, setupSecret } = body;

    if (setupSecret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: 'Setup secret inválido' }, { status: 403 });
    }

    // Check if any admin already exists
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Ya existe un administrador. Endpoint deshabilitado.' },
        { status: 409 },
      );
    }

    const clean = sanitizeString(String(username ?? ''));
    const pw = String(password ?? '');

    if (!clean || pw.length < 8) {
      return NextResponse.json(
        { error: 'Username requerido y contraseña mínimo 8 caracteres' },
        { status: 400 },
      );
    }

    const hash = await bcrypt.hash(pw, 12);
    const { data: user, error } = await supabase
      .from('users')
      .insert({ username: clean, password_hash: hash, role: 'admin', is_active: true })
      .select('id, username')
      .single();

    if (error) throw error;

    return NextResponse.json({
      message: 'Admin creado exitosamente. Elimina o deshabilita este endpoint en producción.',
      user,
    });
  } catch (err) {
    console.error('[setup]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
