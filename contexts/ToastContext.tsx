import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Toast from '../components/Toast';
import { ToastProps as ToastData } from '../components/Toast';

type ToastOptions = Omit<ToastData, 'id' | 'onDismiss'>;

interface ToastContextType {
  addToast: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const onDismiss = useCallback((id: string) => {
      setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
  }, []);
  
  const addToast = useCallback((options: ToastOptions) => {
    const id = crypto.randomUUID();
    const newToast: ToastData = { ...options, id, onDismiss };
    setToasts(currentToasts => [newToast, ...currentToasts]);
  }, [onDismiss]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
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