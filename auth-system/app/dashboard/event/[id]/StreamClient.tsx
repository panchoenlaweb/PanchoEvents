'use client';
import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Calendar } from 'lucide-react';
import type { JWTPayload } from '@/types';
import { formatDate } from '@/lib/utils';

interface Props {
  user: JWTPayload;
  event: Record<string, unknown>;
}

export function StreamClient({ user, event: ev }: Props) {
  const router = useRouter();

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
      <header className="sticky top-0 z-40 border-b border-dark-border bg-black/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 font-display text-[0.6rem] tracking-widest uppercase text-zinc-500 hover:text-amber transition-colors"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <div className="w-px h-4 bg-zinc-800 hidden sm:block" />
            <span className="font-display text-sm text-zinc-200 tracking-wide line-clamp-1 hidden sm:block max-w-xs">
              {String(ev.title)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber animate-[liveblink_0.9s_steps(1)_infinite]" />
            <span className="font-display text-[0.6rem] tracking-widest text-amber uppercase hidden sm:block">
              En Vivo
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 font-display text-[0.6rem] tracking-widest uppercase text-zinc-600 border border-zinc-800 px-3 py-1.5 hover:text-amber hover:border-amber/50 transition-all"
            >
              <LogOut size={12} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Player */}
      <div className="bg-black w-full">
        <div className="max-w-5xl mx-auto">
          {ev.stream_url ? (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={String(ev.stream_url)}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div
              className="relative w-full flex items-center justify-center bg-dark"
              style={{ paddingBottom: '56.25%' }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="text-4xl mb-4 opacity-40">📡</div>
                <p className="font-display text-sm tracking-widest text-zinc-500 uppercase">
                  Stream no configurado
                </p>
                <p className="text-zinc-600 text-sm font-sans mt-2">
                  El administrador aún no ha añadido la URL de retransmisión.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div className="border-b border-dark-border bg-dark-panel">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <span className="font-display text-base text-amber tracking-wide">
            {String(ev.title)}
          </span>
          {ev.event_date as string && (
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Calendar size={12} />
              <span className="font-display text-[0.65rem] tracking-wide">
                {formatDate(String(ev.event_date))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="max-w-5xl mx-auto w-full px-5 py-8 flex-1">
        {ev.description as string && (
          <div className="bg-dark-card border border-dark-border p-5 relative mb-6">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" />
            <p className="font-display text-[0.6rem] tracking-[0.3em] text-amber uppercase mb-3">
              Descripción
            </p>
            <p className="text-zinc-400 text-sm font-sans leading-relaxed">
              {String(ev.description)}
            </p>
          </div>
        )}

        <div className="bg-dark-card border border-dark-border p-5 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/30 to-transparent" />
          <p className="font-display text-[0.6rem] tracking-[0.3em] text-amber uppercase mb-3">
            Acceso al Stream
          </p>
          <p className="text-zinc-400 text-sm font-sans leading-relaxed">
            Tu acceso es <strong className="text-zinc-200">personal e intransferible</strong>.
            No compartas este enlace con nadie.
            <br />
            Si tienes problemas técnicos, contacta al administrador.
          </p>
          <p className="text-zinc-600 text-xs font-display tracking-widest mt-3">
            Usuario: {user.username}
          </p>
        </div>
      </div>

      <footer className="border-t border-dark-border py-5 text-center">
        <p className="font-display text-[0.55rem] tracking-widest text-zinc-700 uppercase">
          PanchoEvents · Stream privado · Solo para usuarios autorizados
        </p>
      </footer>

      <style>{`
        @keyframes liveblink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
