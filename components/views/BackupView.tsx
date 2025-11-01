import React, { useRef } from 'react';
import { UploadCloudIcon, DownloadCloudIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import { useToast } from '../../contexts/ToastContext';

interface BackupViewProps {
  setActiveTab: (tab: 'dashboard' | 'importar' | 'base' | 'backup' | 'settings') => void;
}

const BackupView: React.FC<BackupViewProps> = ({ setActiveTab }) => {
    const { handleDownloadBackup, handleRestoreBackup } = useAppContext();
    const { addToast } = useToast();
    const restoreFileInputRef = useRef<HTMLInputElement>(null);

    const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/json') {
            handleRestoreBackup(file, (result) => {
                if (result.success) {
                    addToast({ type: 'success', message: result.message! });
                    setActiveTab('dashboard');
                } else {
                    addToast({ type: 'error', message: result.message! });
                }
            });
        } else {
            addToast({ type: 'warning', message: 'Por favor, selecciona un archivo JSON válido.' });
        }
        if (e.target) e.target.value = ''; // Reset file input
    };

    const handleDownloadClick = () => {
        const result = handleDownloadBackup();
        if (result.success) {
            addToast({ type: 'success', message: result.message! });
        } else {
            addToast({ type: 'error', message: result.message! });
        }
    };

    return (
        <div className="space-y-8 max-w-lg mx-auto">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2">Restaurar Copia de Seguridad</h2>
                <p className="text-gray-400 mb-4 text-sm">Sube tu archivo (.json) para restaurar todos tus datos.</p>
                <input type="file" ref={restoreFileInputRef} onChange={handleRestoreFileSelect} accept=".json" className="hidden" />
                <button onClick={() => restoreFileInputRef.current?.click()} className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    <UploadCloudIcon className="w-5 h-5"/><span>Subir Copia (JSON)</span>
                </button>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2">Crear Copia de Seguridad</h2>
                <p className="text-gray-400 mb-4 text-sm">Descarga una copia de todas tus transacciones y categorías.</p>
                <button onClick={handleDownloadClick} className="w-full flex items-center justify-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    <DownloadCloudIcon className="w-5 h-5"/><span>Descargar Copia (JSON)</span>
                </button>
            </div>
        </div>
    );
};

export default BackupView;