'use client';
import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="font-display text-[0.65rem] tracking-widest text-zinc-400 uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full bg-dark border text-zinc-100 placeholder-zinc-600 font-sans text-sm transition-all duration-200',
              'focus:outline-none focus:border-amber/70 focus:ring-1 focus:ring-amber/30',
              error ? 'border-red-500/70' : 'border-zinc-800 hover:border-zinc-600',
              icon ? 'pl-9 pr-4 py-2.5' : 'px-4 py-2.5',
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-red-400 text-xs font-sans">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
