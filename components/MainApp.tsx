import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import Dashboard from './Dashboard';
import Import from './Import';
import { useAppContext } from '../contexts/AppContext';
import DatabaseView from './views/DatabaseView';
import BackupView from './views/BackupView';
import SettingsView from './views/SettingsView';

type ActiveTab = 'dashboard' | 'importar' | 'base' | 'backup' | 'settings';

const MainApp: React.FC = () => {
  const { allTransactions } = useAppContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | 'all'>('all');
  
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const transactionYear = new Date(t.date).getFullYear();
      const transactionMonth = new Date(t.date).getMonth();
      if (transactionYear !== year) return false;
      if (month !== 'all' && transactionMonth !== month) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, year, month]);

  const years = useMemo(() => {
    const transactionYears = Array.from(new Set(allTransactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => Number(b) - Number(a));
    return transactionYears.length > 0 ? transactionYears : [new Date().getFullYear()];
  }, [allTransactions]);

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const renderContent = () => {
    switch(activeTab) {
        case 'dashboard':
            return <Dashboard transactions={filteredTransactions} />;
        case 'importar':
            return <Import setActiveTab={setActiveTab} />;
        case 'base':
            return <DatabaseView transactions={filteredTransactions} />;
        case 'backup':
            return <BackupView setActiveTab={setActiveTab}/>;
        case 'settings':
            return <SettingsView />;
        default:
            return <Dashboard transactions={filteredTransactions} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Panel de Presupuesto</h1>
        </header>

        <nav className="mb-6 flex space-x-2 border-b border-slate-700 overflow-x-auto">
          {['dashboard', 'importar', 'base', 'backup', 'settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as ActiveTab)} 
                    className={`px-4 py-2 font-medium text-lg transition-colors duration-200 whitespace-nowrap ${activeTab === tab ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('importar', 'Importar Datos').replace('base', 'Base de Datos').replace('backup', 'Copia de Seguridad').replace('settings', 'Configuración')}
            </button>
          ))}
        </nav>
        
        {activeTab !== 'settings' && activeTab !== 'importar' && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2">
                {years.map(y => <button key={y} onClick={() => setYear(y)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${year === y ? 'bg-violet-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>{y}</button>)}
            </div>
            <div className="w-full sm:w-auto h-px sm:h-6 bg-slate-700 mx-2 hidden sm:block"></div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <button onClick={() => setMonth('all')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${month === 'all' ? 'bg-pink-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>Anual</button>
                {months.map((m, i) => <button key={m} onClick={() => setMonth(i)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${month === i ? 'bg-pink-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>{m}</button>)}
            </div>
        </div>
        )}

        <main>
            {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default MainApp;