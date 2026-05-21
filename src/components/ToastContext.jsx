import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const DEFAULT_DURATIONS = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000
};

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle
};

const STYLES = {
  success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
  error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
};

const ICON_COLORS = {
  success: 'text-green-600 dark:text-green-400',
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((type, message, options = {}) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const duration = options.duration ?? DEFAULT_DURATIONS[type] ?? 4000;
    setToasts(prev => [...prev, { id, type, message, duration }]);
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(t => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const api = useMemo(() => ({
    show,
    dismiss,
    success: (message, options) => show('success', message, options),
    info: (message, options) => show('info', message, options),
    warning: (message, options) => show('warning', message, options),
    error: (message, options) => show('error', message, options)
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || Info;
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border shadow-lg p-3 toast-enter ${STYLES[toast.type] || STYLES.info}`}
    >
      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${ICON_COLORS[toast.type] || ICON_COLORS.info}`} aria-hidden="true" />
      <div className="flex-1 text-sm break-words">{toast.message}</div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {},
      dismiss: () => {},
      success: () => {},
      info: () => {},
      warning: () => {},
      error: () => {}
    };
  }
  return ctx;
}
