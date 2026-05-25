'use client';
import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Calendar, Film, Play, Radio } from 'lucide-react';
import type { JWTPayload } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface Props {
  user: JWTPayload;
  events: Record<string, unknown>[];
}

export function DashboardClient({ user, events }: Props) {
  const router = useRouter();

  // Heartbeat: ping every 20s — detects revoked session immediately
  const heartbeat = useCallback(async () => {
    const res = await fetch('/api/session/ping', { method: 'POST', cache: 'no-store' });
    if (res.status === 401) router.replace('/login?reason=session_revoked');
  }, [router]);

  // Auto-refresh access token every 12 min (JWT lasts 15 min)
  const refreshToken = useCallback(async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' });
    if (res.status === 401) router.replace('/login?reason=session_revoked');
  }, [router]);

  useEffect(() => {
    const pingId    = setInterval(heartbeat,     20_000);
    const refreshId = setInterval(refreshToken, 12 * 60 * 1000);
    return () => { clearInterval(pingId); clearInterval(refreshId); };
  }, [heartbeat, refreshToken]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <div className="min-h-dvh bg-dark flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-dark-border bg-black/75 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div>
            <span className="font-display text-lg text-amber tracking-wider">
              YPass
            </span>
            <span className="ml-2 font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase hidden sm:inline">
              · Viewing Parties
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-[0.65rem] tracking-widest text-zinc-500 uppercase hidden sm:block">
              {user.username}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 font-display text-[0.6rem] tracking-widest uppercase text-zinc-500 border border-zinc-800 px-3 py-1.5 hover:text-amber hover:border-amber/50 transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-5 py-10">
        <div className="mb-8">
          <h2 className="font-display text-[0.6rem] tracking-[0.3em] text-zinc-500 uppercase mb-1">
            Bienvenido
          </h2>
          <h1 className="font-display text-2xl text-zinc-100 tracking-wider">
            {user.username}
          </h1>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-5">🎟️</div>
            <p className="font-display text-sm tracking-widest text-zinc-400 uppercase mb-3">
              Sin eventos asignados
            </p>
            <p className="text-zinc-500 text-sm font-sans mt-2 max-w-sm leading-relaxed">
              Aún no tienes acceso a ningún viewing party. Si ya coordinaste tu pago,
              contáctanos por Telegram para activar tu acceso.
            </p>
            <a
              href="https://t.me/panchoenlared"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 font-display text-[0.65rem] tracking-widest uppercase text-amber border border-amber/40 px-5 py-2.5 hover:bg-amber/10 transition-colors"
            >
              ✈ Contactar por Telegram
            </a>
          </div>
        ) : (
          <>
            <p className="font-display text-[0.6rem] tracking-[0.25em] text-zinc-600 uppercase mb-6">
              Tus retransmisiones — {events.length} evento{events.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((ev) => (
                <EventCard key={String(ev.id)} event={ev} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-dark-border py-5 text-center">
        <p className="font-display text-[0.55rem] tracking-widest text-zinc-700 uppercase">
          YPass · Acceso Personal · No compartir
        </p>
      </footer>
    </div>
  );
}

function useCountdown(eventDate: string | null) {
  const [cd, setCd] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!eventDate) return;
    const target = new Date(eventDate).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setCd(null); return; }
      setCd({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [eventDate]);
  return cd;
}

function EventCard({ event: ev }: { event: Record<string, unknown> }) {
  const router = useRouter();
  const isActive  = ev.status === 'active';
  const dateStr   = ev.event_date ? String(ev.event_date) : null;
  const countdown = useCountdown(dateStr);
  const isLive    = isActive && !!ev.stream_url && dateStr
    ? Date.now() - new Date(dateStr).getTime() < 10 * 60 * 60 * 1_000   // within last 10h
    : false;

  return (
    <div
      onClick={() => isActive && router.push(`/dashboard/event/${ev.id}`)}
      className={`group relative border border-dark-border bg-dark-card overflow-hidden transition-all duration-300 ${
        isActive
          ? 'cursor-pointer hover:border-amber/50 hover:shadow-[0_0_24px_rgba(245,182,58,0.12)]'
          : 'opacity-50 cursor-not-allowed'
      }`}
    >
      {/* Top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Thumbnail */}
      <div className="relative aspect-video bg-dark overflow-hidden">
        {ev.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={String(ev.thumbnail_url)}
            alt={String(ev.title)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={32} className="text-zinc-700" />
          </div>
        )}
        {isLive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600/90 px-2 py-1 text-white">
            <Radio size={10} className="animate-pulse" />
            <span className="font-display text-[0.55rem] tracking-widest uppercase">En vivo</span>
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full border-2 border-amber flex items-center justify-center">
              <Play size={18} className="text-amber ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-sm text-zinc-100 tracking-wide leading-snug">
            {String(ev.title)}
          </h3>
          <Badge variant={isActive ? 'active' : 'inactive'}>
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
        {ev.description as string && (
          <p className="text-zinc-500 text-xs font-sans leading-relaxed mb-3 line-clamp-2">
            {String(ev.description)}
          </p>
        )}
        {ev.event_date as string && (
          <div className="flex items-center gap-1.5 text-zinc-600 mb-2">
            <Calendar size={11} />
            <span className="font-display text-[0.6rem] tracking-wide">
              {formatDate(String(ev.event_date))}
            </span>
          </div>
        )}
        {countdown && isActive && (
          <div className="flex items-center gap-2 bg-amber/5 border border-amber/20 px-3 py-2">
            <span className="font-display text-[0.55rem] tracking-widest text-amber/60 uppercase">Faltan</span>
            {countdown.d > 0 && (
              <span className="font-display text-xs text-amber">{countdown.d}<span className="text-[0.5rem] text-amber/50 ml-0.5">d</span></span>
            )}
            <span className="font-display text-xs text-amber">{String(countdown.h).padStart(2,'0')}<span className="text-[0.5rem] text-amber/50 ml-0.5">h</span></span>
            <span className="font-display text-xs text-amber">{String(countdown.m).padStart(2,'0')}<span className="text-[0.5rem] text-amber/50 ml-0.5">m</span></span>
            <span className="font-display text-xs text-amber">{String(countdown.s).padStart(2,'0')}<span className="text-[0.5rem] text-amber/50 ml-0.5">s</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
