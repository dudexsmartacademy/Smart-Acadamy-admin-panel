import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WRITE_ERROR_EVENT } from '../lib/persist';
import { ToastMessage, ToastType } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, message?: string, type: ToastType = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = { id, title, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  // Background saves report failures through this event (lib/persist.ts).
  useEffect(() => {
    const onWriteError = (event: Event) =>
      showToast('Not saved', (event as CustomEvent<string>).detail, 'error', 7000);
    window.addEventListener(WRITE_ERROR_EVENT, onWriteError);
    return () => window.removeEventListener(WRITE_ERROR_EVENT, onWriteError);
  }, [showToast]);

  const success = useCallback((title: string, message?: string) => showToast(title, message, 'success'), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast(title, message, 'error', 5000), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast(title, message, 'warning', 4500), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast(title, message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 ${
                isSuccess
                  ? 'bg-[#171311]/95 border-emerald-500/30 text-[#F5F0EA] shadow-emerald-950/20'
                  : isError
                  ? 'bg-[#171311]/95 border-rose-500/30 text-[#F5F0EA] shadow-rose-950/20'
                  : isWarning
                  ? 'bg-[#171311]/95 border-amber-500/30 text-[#F5F0EA] shadow-amber-950/20'
                  : 'bg-[#171311]/95 border-[#5A321F]/60 text-[#F5F0EA] shadow-[#2A1710]/40'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <XCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {isInfo && <Info className="w-5 h-5 text-[#946246]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#F5F0EA] leading-tight">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-[#A89A91] mt-1 line-clamp-2 leading-relaxed">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-[#A89A91] hover:text-[#F5F0EA] p-1 rounded-md hover:bg-[#2A1710]/50 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
