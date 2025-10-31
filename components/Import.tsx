
import React, { lazy, Suspense } from 'react';
import { SpinnerIcon } from './icons';

// AiImportView ha sido rediseñado para ser el único gestor de importaciones.
const AiImportView = lazy(() => import('./AiImportView'));

type Tab = 'dashboard' | 'importar' | 'base' | 'backup' | 'settings';

const Import: React.FC<{ setActiveTab: (tab: Tab) => void; }> = ({ setActiveTab }) => {
    
    const apiKeyExists = !!process.env.API_KEY;

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800 rounded-xl">
            <SpinnerIcon className="w-16 h-16 text-violet-400 animate-spin mb-4" />
            <p>Cargando gestor de importación...</p>
        </div>
    );
    
    // Si no hay API Key, la funcionalidad principal no puede operar.
    if (!apiKeyExists) {
        return (
            <div className="bg-amber-900/50 border border-amber-700 p-6 rounded-xl text-center max-w-3xl mx-auto">
                <h3 className="text-xl font-bold text-amber-200 mb-2">Función de Importación Desactivada</h3>
                <p className="text-amber-300">
                    La importación automática de extractos requiere una clave de API de Google.
                    <br />
                    Por favor, configura la variable de entorno <code className="bg-slate-700 text-white px-2 py-1 rounded-md mx-1 font-mono">API_KEY</code> para activar esta potente función.
                </p>
            </div>
        );
    }
    
    return (
        <div>
            <Suspense fallback={renderLoading()}>
                <AiImportView setActiveTab={setActiveTab} />
            </Suspense>
        </div>
    );
};

export default Import;
