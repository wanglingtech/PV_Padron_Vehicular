import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(t => {
          const icons = {
            success: <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />,
            error: <AlertCircle className="text-rose-600 shrink-0" size={20} />,
            warning: <AlertTriangle className="text-amber-600 shrink-0" size={20} />,
            info: <Info className="text-blue-600 shrink-0" size={20} />,
          };

          const borders = {
            success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-950 dark:text-emerald-100',
            error: 'border-rose-200 dark:border-rose-800 bg-rose-50/95 dark:bg-rose-950/95 text-rose-950 dark:text-rose-100',
            warning: 'border-amber-200 dark:border-amber-800 bg-amber-50/95 dark:bg-amber-950/95 text-amber-950 dark:text-amber-100',
            info: 'border-blue-200 dark:border-blue-800 bg-blue-50/95 dark:bg-blue-950/95 text-blue-950 dark:text-blue-100',
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 shadow-lg backdrop-blur-xs transition-all animate-in fade-in slide-in-from-bottom-2 ${borders[t.type]}`}
            >
              {icons[t.type]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs opacity-90 leading-relaxed">{t.message}</p>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-md opacity-60 hover:opacity-100 hover:bg-black/5"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
