import React, { useState, useCallback, createContext, useContext, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

const TOAST_DURATION = 3500;

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => onDismiss(toast.id), 300);
    }, TOAST_DURATION);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const bgColor =
    toast.type === 'success'
      ? 'var(--surface-success)'
      : toast.type === 'error'
        ? 'var(--surface-danger)'
        : 'var(--bg-elevated)';

  const borderColor =
    toast.type === 'success'
      ? 'var(--text-success)'
      : toast.type === 'error'
        ? 'var(--text-danger)'
        : 'var(--border-strong)';

  const textColor =
    toast.type === 'success'
      ? 'var(--text-success)'
      : toast.type === 'error'
        ? 'var(--text-danger)'
        : 'var(--text-primary)';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={exiting ? 'toast-exit' : 'toast-enter'}
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
        padding: '12px 16px',
        fontSize: '13px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '420px',
        width: '100%',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onClick={() => {
        setExiting(true);
        window.setTimeout(() => onDismiss(toast.id), 300);
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <span style={{ opacity: 0.4, fontSize: '10px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dismiss</span>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
