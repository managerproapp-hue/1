import React from 'react';
import { AlertTriangleIcon } from '../icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={onCancel}>
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-700 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 flex items-start">
            <div className="flex-shrink-0 mr-4">
                <div className="h-12 w-12 rounded-full bg-rose-900/50 flex items-center justify-center">
                    <AlertTriangleIcon className="h-6 w-6 text-rose-400" />
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
                <p className="text-gray-400">{message}</p>
            </div>
        </div>
        <div className="flex justify-end space-x-4 p-4 bg-slate-900/50 rounded-b-xl">
          <button onClick={onCancel} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Confirmar
          </button>
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ConfirmationModal;