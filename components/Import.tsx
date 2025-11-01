
import React, { lazy, Suspense } from 'react';
import { SpinnerIcon } from './icons';

// AiImportView ha sido rediseñado para ser el único gestor de importaciones.
const AiImportView = lazy(() => import('./AiImportView'));

type Tab = 'dashboard' | 'importar' | 'base' | 'backup' | 'settings';

interface ImportProps {
    setActiveTab: (tab: Tab) => void;
    onImportComplete: () => void;
}


const Import: React.FC<ImportProps> = ({ setActiveTab, onImportComplete }) => {
    
    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800 rounded-xl">
            <SpinnerIcon className="w-16 h-16 text-violet-400 animate-spin mb-4" />
            <p>Cargando gestor de importación...</p>
        </div>
    );
    
    return (
        <div>
            <Suspense fallback={renderLoading()}>
                <AiImportView 
                  setActiveTab={setActiveTab as (tab: 'dashboard' | 'settings') => void} 
                  onImportComplete={onImportComplete}
                />
            </Suspense>
        </div>
    );
};

export default Import;