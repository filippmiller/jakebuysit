import { useState } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast({ title, description, variant = 'default' }: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    const newToast = { id, title, description, variant };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);

    return { id };
  }

  return { toasts, toast };
}
