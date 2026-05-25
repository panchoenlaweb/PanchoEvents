import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { supabase } from './supabase';
import type { JWTPayload } from '@/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
export const COOKIE_NAME         = 'pe_session';
export const REFRESH_COOKIE_NAME = 'pe_refresh';
export const ACCESS_TOKEN_DURATION_MS  = 15 * 60 * 1000;        // 15 minutes
export const REFRESH_TOKEN_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_DURATION_MS       = REFRESH_TOKEN_DURATION_MS;

// ── JWT ────────────────────────────────────────────────────────────────────────

export async function createJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...(payload as unknown as Record<string, unknown>) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ── Session validation (used by API routes) ───────────────────────────────────

export async function requireAuth(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', payload.userId)
    .eq('session_token', payload.sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return null;
  return payload;
}

export async function requireAdmin(req: NextRequest): Promise<JWTPayload | null> {
  const payload = await requireAuth(req);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

// ── Server component helper ───────────────────────────────────────────────────

export async function getServerUser(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = (cookieStore as ReturnType<typeof cookies>).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', payload.userId)
    .eq('session_token', payload.sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return null;
  return payload;
}

// ── Session management ────────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ sessionToken: string; refreshToken: string }> {
  // Delete ALL existing sessions → single-session enforcement
  await supabase.from('sessions').delete().eq('user_id', userId);

  const sessionToken  = crypto.randomUUID();
  const refreshToken  = crypto.randomUUID();
  const expiresAt     = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await supabase.from('sessions').insert({
    user_id:       userId,
    session_token: sessionToken,
    refresh_token: refreshToken,
    expires_at:    expiresAt,
    ip_address:    ipAddress ?? null,
    user_agent:    userAgent ?? null,
    last_ping:     new Date().toISOString(),
  });

  return { sessionToken, refreshToken };
}

export async function refreshSession(
  refreshToken: string,
): Promise<{ sessionToken: string; payload: JWTPayload } | null> {
  const { data: session } = await supabase
    .from('sessions')
    .select('*, users(id, username, role, is_active)')
    .eq('refresh_token', refreshToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session || !session.users?.is_active) return null;

  // Rotate session_token (new sessionId on every refresh)
  const newSessionToken = crypto.randomUUID();
  await supabase
    .from('sessions')
    .update({ session_token: newSessionToken, last_ping: new Date().toISOString() })
    .eq('refresh_token', refreshToken);

  const jwtPayload: JWTPayload = {
    userId:       session.users.id,
    username:     session.users.username,
    role:         session.users.role as 'admin' | 'user',
    sessionToken: newSessionToken,
  };

  return { sessionToken: newSessionToken, payload: jwtPayload };
}

export async function deleteSession(userId: string): Promise<void> {
  await supabase.from('sessions').delete().eq('user_id', userId);
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export function buildSessionCookie(jwt: string) {
  return {
    name: COOKIE_NAME,
    value: jwt,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: ACCESS_TOKEN_DURATION_MS / 1000, // 15 min
      path: '/',
    },
  };
}

export function buildRefreshCookie(refreshToken: string) {
  return {
    name: REFRESH_COOKIE_NAME,
    value: refreshToken,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: REFRESH_TOKEN_DURATION_MS / 1000, // 30 days
      path: '/',
    },
  };
}
