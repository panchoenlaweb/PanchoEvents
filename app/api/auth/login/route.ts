import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { createJWT, createSession, buildSessionCookie } from '@/lib/auth';
import { getClientIp, sanitizeString } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = sanitizeString(String(body.username ?? ''));
    const password = String(body.password ?? '');

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    const ip = getClientIp(req);
    const ua = req.headers.get('user-agent') ?? null;
    const identifier = username.toLowerCase();

    // Rate limiting: max 10 failed attempts per identifier in 15 min
    const since15m = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failedCount } = await supabase
      .from('access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'login_failed')
      .eq('username', identifier)
      .gte('created_at', since15m);

    if ((failedCount ?? 0) >= 10) {
      return NextResponse.json(
        { error: 'Demasiados intentos fallidos. Espera 15 minutos.' },
        { status: 429 },
      );
    }

    // Find user by username OR email
    const { data: user } = await supabase
      .from('users')
      .select('id, username, email, password_hash, role, is_active')
      .or(`username.ilike.${identifier},email.ilike.${identifier}`)
      .single();

    // Constant-time comparison to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingprotectionxx';
    const hashToCompare = user?.password_hash ?? dummyHash;
    const passwordValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordValid) {
      await supabase.from('access_logs').insert({
        user_id: user?.id ?? null,
        username: identifier,
        event_type: 'login_failed',
        ip_address: ip,
        user_agent: ua,
        metadata: { reason: 'invalid_credentials' },
      });
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    if (!user.is_active) {
      await supabase.from('access_logs').insert({
        user_id: user.id,
        username: user.username,
        event_type: 'login_failed',
        ip_address: ip,
        user_agent: ua,
        metadata: { reason: 'account_disabled' },
      });
      return NextResponse.json(
        { error: 'Cuenta desactivada. Contacta al administrador.' },
        { status: 403 },
      );
    }

    // Create session — invalidates all previous sessions (single-session)
    const sessionToken = await createSession(user.id, ip ?? undefined, ua ?? undefined);

    // Sign JWT
    const jwt = await createJWT({
      userId: user.id,
      username: user.username,
      role: user.role as 'admin' | 'user',
      sessionToken,
    });

    // Update last_login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Log success
    await supabase.from('access_logs').insert({
      user_id: user.id,
      username: user.username,
      event_type: 'login',
      ip_address: ip,
      user_agent: ua,
    });

    const { name, value, options } = buildSessionCookie(jwt);
    const response = NextResponse.json({
      message: 'Login exitoso',
      user: { id: user.id, username: user.username, role: user.role },
    });
    response.cookies.set(name, value, options);
    return response;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
