'use client';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'active' | 'inactive' | 'admin' | 'user' | 'info' | 'warning';
  className?: string;
}

export function Badge({ children, variant = 'info', className }: BadgeProps) {
  const variants = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    inactive: 'bg-zinc-800 text-zinc-500 border-zinc-700',
    admin: 'bg-amber/10 text-amber border-amber/30',
    user: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    info: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    warning: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 font-display text-[0.6rem] tracking-widest uppercase border',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
