'use client';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Calendar, Film, Play } from 'lucide-react';
import type { JWTPayload } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface Props {
  user: JWTPayload;
  events: Record<string, unknown>[];
}

export function DashboardClient({ user, events }: Props) {
  const router = useRouter();

  // Poll every 30s to detect session invalidation
  const checkSession = useCallback(async () => {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (res.status === 401) router.replace('/login?reason=expired');
  }, [router]);

  useEffect(() => {
    const id = setInterval(checkSession, 30_000);
    return () => clearInterval(id);
  }, [checkSession]);

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
              PanchoEvents
            </span>
            <span className="ml-2 font-display text-[0.6rem] tracking-widest text-zinc-500 uppercase hidden sm:inline">
              · Stream Privado
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
            <div className="text-5xl mb-5 opacity-30">📭</div>
            <p className="font-display text-sm tracking-widest text-zinc-500 uppercase">
              Sin eventos asignados
            </p>
            <p className="text-zinc-600 text-sm font-sans mt-2 max-w-xs">
              Tu administrador aún no ha asignado ningún evento a tu cuenta.
            </p>
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
          PanchoEvents · Acceso Personal · No compartir
        </p>
      </footer>
    </div>
  );
}

function EventCard({ event: ev }: { event: Record<string, unknown> }) {
  const router = useRouter();
  const isActive = ev.status === 'active';

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
          <div className="flex items-center gap-1.5 text-zinc-600">
            <Calendar size={11} />
            <span className="font-display text-[0.6rem] tracking-wide">
              {formatDate(String(ev.event_date))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
