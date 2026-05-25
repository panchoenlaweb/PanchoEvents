'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reason = params.get('reason');

  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ambient particle canvas (matches existing aesthetic)
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const lights: Array<{ x: number; y: number; r: number; a: number; da: number; h: number }> = [];
    function resize() {
      if (!cv) return;
      cv.width = window.innerWidth;
      cv.height = window.innerHeight;
    }
    function init() {
      if (!cv) return;
      lights.length = 0;
      for (let i = 0; i < 80; i++) {
        lights.push({
          x: Math.random() * cv.width,
          y: Math.random() * cv.height * 0.4,
          r: Math.random() * 2 + 1,
          a: Math.random(),
          da: (Math.random() * 0.012 + 0.003) * (Math.random() > 0.5 ? 1 : -1),
          h: 34 + Math.random() * 20,
        });
      }
    }
    function draw() {
      if (!cv || !ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      lights.forEach((l) => {
        l.a += l.da;
        if (l.a > 1 || l.a < 0.1) l.da *= -1;
        const a = Math.max(0, Math.min(1, l.a));
        const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 8);
        g.addColorStop(0, `hsla(${l.h},88%,68%,${a * 0.3})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${l.h},95%,90%,${a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    resize();
    init();
    draw();
    window.addEventListener('resize', () => { resize(); init(); });
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', () => {});
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.password) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Error al iniciar sesión');
        return;
      }

      router.replace(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh flex items-center justify-center p-4 bg-dark overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Card */}
        <div className="bg-dark-card border border-dark-border relative">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber to-transparent" />

          <div className="px-8 py-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="text-4xl mb-3 animate-[glow-pulse_2.5s_ease-in-out_infinite]">🔐</div>
              <h1 className="font-display text-2xl text-amber tracking-wider mb-1">
                YPass
              </h1>
              <p className="font-display text-[0.6rem] tracking-[0.25em] text-zinc-500 uppercase">
                Acceso Privado · Viewing Parties
              </p>
            </div>

            {/* Session expired banner */}
            {reason === 'expired' && !error && (
              <div className="mb-5 px-4 py-3 bg-amber/10 border border-amber/30 text-amber text-xs font-sans">
                Tu sesión expiró. Vuelve a iniciar sesión.
              </div>
            )}
            {reason === 'session_revoked' && !error && (
              <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-sans">
                ⚠️ Tu sesión fue cerrada porque se inició sesión desde otro dispositivo.
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="username"
                label="Usuario"
                type="text"
                autoComplete="username"
                autoFocus
                placeholder="tu_usuario"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                icon={<User size={15} />}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="font-display text-[0.65rem] tracking-widest text-zinc-400 uppercase">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-dark border border-zinc-800 hover:border-zinc-600 focus:border-amber/70 focus:ring-1 focus:ring-amber/30 text-zinc-100 placeholder-zinc-600 font-sans text-sm pl-9 pr-10 py-2.5 transition-all duration-200 focus:outline-none"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs font-sans -mt-1 animate-fade-in">{error}</p>
              )}

              <Button
                type="submit"
                size="lg"
                loading={loading}
                className="mt-2 w-full"
              >
                Entrar →
              </Button>
            </form>

            <p className="text-center text-zinc-600 text-[0.65rem] font-sans mt-6">
              Acceso restringido · Solo usuarios autorizados
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-700 text-[0.6rem] font-display tracking-widest uppercase mt-6">
          YPass · panchoenlared.com
        </p>
      </div>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { filter: none; }
          50% { filter: drop-shadow(0 0 18px rgba(245,182,58,0.7)); }
        }
      `}</style>
    </div>
  );
}

