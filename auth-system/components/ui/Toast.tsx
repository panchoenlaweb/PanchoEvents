'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  const config = {
    success: { icon: CheckCircle, border: 'border-emerald-500/40', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    error: { icon: XCircle, border: 'border-red-500/40', text: 'text-red-400', bg: 'bg-red-500/10' },
    warning: { icon: AlertCircle, border: 'border-amber/40', text: 'text-amber', bg: 'bg-amber/10' },
  };

  const { icon: Icon, border, text, bg } = config[toast.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 border rounded-sm shadow-2xl min-w-[280px] max-w-sm animate-slide-up',
        'bg-dark-panel',
        border,
      )}
    >
      <Icon size={16} className={cn('mt-0.5 shrink-0', text)} />
      <p className={cn('text-sm font-sans flex-1', bg ? '' : '')}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Hook
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast, toast: addToast };
}
