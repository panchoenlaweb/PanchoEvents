'use client';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-display font-semibold tracking-widest uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60';

    const variants = {
      primary:
        'bg-amber text-black hover:bg-yellow-300 hover:shadow-[0_0_20px_rgba(245,182,58,0.4)]',
      ghost:
        'bg-transparent text-amber border border-amber/30 hover:border-amber hover:text-amber',
      danger:
        'bg-transparent text-red-400 border border-red-400/30 hover:border-red-400 hover:bg-red-400/10',
      outline:
        'bg-transparent text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200',
    };

    const sizes = {
      sm: 'text-[0.6rem] px-3 py-1.5 gap-1.5',
      md: 'text-[0.7rem] px-5 py-2.5 gap-2',
      lg: 'text-[0.75rem] px-7 py-3.5 gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
