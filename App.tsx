import React, { useState, FC } from 'react';
import { SpinnerIcon, PiggyBankIcon, SparklesIcon } from './components/icons';
import MainApp from './components/MainApp';
import { AppProvider } from './contexts/AppContext';

// --- Welcome Component ---
const Welcome: FC<{ onEnter: () => void }> = ({ onEnter }) => (
    <div className="min-h-screen bg-slate-900 text-gray-200 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto bg-slate-800/50 p-8 rounded-2xl shadow-2xl backdrop-blur-sm border border-slate-700">
            <PiggyBankIcon className="w-16 h-16 text-violet-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-3">Bienvenido a tu Panel de Presupuesto</h1>
            <p className="text-lg text-gray-400 mb-6">
                Visualiza tus finanzas, importa extractos bancarios con IA y toma el control de tu dinero de forma sencilla y potente.
            </p>
            <button
                onClick={onEnter}
                className="flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
                <SparklesIcon className="w-6 h-6" />
                <span>Empezar Ahora</span>
            </button>
        </div>
    </div>
);


// --- App Root Component ---
const App: React.FC = () => {
    const [appStarted, setAppStarted] = useState(false);

    if (!appStarted) {
        return <Welcome onEnter={() => setAppStarted(true)} />;
    }

    return (
        <AppProvider>
            <MainApp />
        </AppProvider>
    );
};


export default App;