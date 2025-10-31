import React, { useState, useEffect, lazy, Suspense } from 'react';
import { SpinnerIcon } from './icons';

const AiImportView = lazy(() => import('./AiImportView'));
const ManualImportView = lazy(() => import('./ManualImportView'));

type ActiveImportView = 'ai' | 'manual';
type Tab = 'dashboard' | 'importar' | 'base' | 'backup' | 'settings';

const Import: React.FC<{ setActiveTab: (tab: Tab) => void; }> = ({ setActiveTab }) => {
    const [apiKeyExists, setApiKeyExists] = useState<boolean | null>(null);
    const [activeView, setActiveView] = useState<ActiveImportView>('ai');

    useEffect(() => {
        const timer = setTimeout(() => {
            setApiKeyExists(!!process.env.API_KEY);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800 rounded-xl">
            <SpinnerIcon className="w-16 h-16 text-violet-400 animate-spin mb-4" />
        </div>
    );
    
    if (apiKeyExists === null) {
        return renderLoading();
    }

    if (!apiKeyExists) {
        return (
            <div className="space-y-4">
                <div className="bg-amber-900/50 border border-amber-700 p-4 rounded-xl text-center">
                    <p className="text-amber-200">
                        La clave de API de Google no está configurada. La importación inteligente está desactivada.
                        <br />
                        Puedes usar la importación manual de CSV o configurar la variable de entorno <code className="bg-slate-700 text-white px-2 py-1 rounded-md mx-1 font-mono">API_KEY</code> en Vercel.
                    </p>
                </div>
                <Suspense fallback={renderLoading()}>
                    <ManualImportView setActiveTab={setActiveTab} />
                </Suspense>
            </div>
        );
    }
    
    return (
        <div>
            <div className="mb-4 border-b border-slate-700 flex">
                <button 
                    onClick={() => setActiveView('ai')} 
                    className={`px-4 py-2 font-medium text-lg transition-colors duration-200 whitespace-nowrap ${activeView === 'ai' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Importación con IA
                </button>
                <button 
                    onClick={() => setActiveView('manual')}
                    className={`px-4 py-2 font-medium text-lg transition-colors duration-200 whitespace-nowrap ${activeView === 'manual' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`}
                >
                    Importación Manual (CSV)
                </button>
            </div>
            
            <Suspense fallback={renderLoading()}>
                {activeView === 'ai' ? <AiImportView setActiveTab={setActiveTab} /> : <ManualImportView setActiveTab={setActiveTab} />}
            </Suspense>
        </div>
    );
};

export default Import;
