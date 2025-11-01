import React, { useEffect, useState } from 'react';
import { XIcon, CheckCircleIcon, XCircleIcon, InfoIcon, AlertTriangleIcon } from './icons';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onDismiss: (id: string) => void;
}

const toastConfig = {
  success: { bg: 'bg-gradient-to-r from-emerald-500 to-green-600', icon: <CheckCircleIcon className="w-6 h-6"/> },
  error: { bg: 'bg-gradient-to-r from-rose-500 to-red-600', icon: <XCircleIcon className="w-6 h-6"/> },
  info: { bg: 'bg-gradient-to-r from-sky-500 to-blue-600', icon: <InfoIcon className="w-6 h-6"/> },
  warning: { bg: 'bg-gradient-to-r from-amber-500 to-yellow-600', icon: <AlertTriangleIcon className="w-6 h-6"/> },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 5000, onDismiss }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const handleDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => onDismiss(id), 300); // Wait for fade-out animation
  };

  const config = toastConfig[type];

  return (
    <div
      className={`flex items-center justify-between w-full p-4 text-white ${config.bg} rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${isFadingOut ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
      role="alert"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">{config.icon}</div>
        <div className="text-sm font-medium">{message}</div>
      </div>
      <button onClick={handleDismiss} className="ml-4 -mr-1 p-1 rounded-md hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white">
        <span className="sr-only">Cerrar</span>
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;