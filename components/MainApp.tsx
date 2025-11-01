import React, { useState, useMemo, lazy, Suspense } from 'react';
import { SpinnerIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import Import from './Import'; // Importación directa del gestor unificado

// Carga perezosa de componentes para un mejor rendimiento inicial
const Dashboard = lazy(() => import('./Dashboard'));
const DatabaseView = lazy(() => import('./views/DatabaseView'));
const BackupView = lazy(() => import('./views/BackupView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const AccountComparisonView = lazy(() => import('./views/AccountComparisonView'));
const BudgetsView = lazy(() => import('./views/BudgetsView'));
const SearchView = lazy(() => import('./views/SearchView'));


type ActiveTab = 'dashboard' | 'importar' | 'base' | 'comparacion' | 'analisis' | 'buscador' | 'backup' | 'settings';

const TABS: { id: ActiveTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'importar', label: 'Importar Datos' },
    { id: 'base', label: 'Base de Datos' },
    { id: 'comparacion', label: 'Comparación' },
    { id: 'analisis', label: 'Análisis' },
    { id: 'buscador', label: 'Buscador' },
    { id: 'backup', label: 'Copia de Seguridad' },
    { id: 'settings', label: 'Configuración' },
];

const MainApp: React.FC = () => {
  const { allTransactions, accounts } = useAppContext();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [month, setMonth] = useState<number | 'all'>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');
  const [searchFilters, setSearchFilters] = useState<{ category: string; term: string }>({ category: 'all', term: '' });
  
  const filteredTransactionsByDate = useMemo(() => {
    return allTransactions.filter(t => {
      const transactionYear = new Date(t.date).getFullYear();
      const transactionMonth = new Date(t.date).getMonth();
      if (!selectedYears.includes(transactionYear)) return false;
      if (month !== 'all' && transactionMonth !== month) return false;
      return true;
    });
  }, [allTransactions, selectedYears, month]);

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') {
      return filteredTransactionsByDate;
    }
    return filteredTransactionsByDate.filter(t => t.accountId === selectedAccountId);
  }, [filteredTransactionsByDate, selectedAccountId]);

  const availableYears = useMemo(() => {
    const transactionYears = Array.from(new Set(allTransactions.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    if (!transactionYears.includes(currentYear)) {
        transactionYears.push(currentYear);
        transactionYears.sort((a, b) => b - a);
    }
    return transactionYears;
  }, [allTransactions]);

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const handleYearToggle = (yearToToggle: number) => {
    setSelectedYears(prev => {
        const isSelected = prev.includes(yearToToggle);
        if (isSelected) {
            if (prev.length === 1) return prev;
            return prev.filter(y => y !== yearToToggle);
        } else {
            return [...prev, yearToToggle].sort((a, b) => b - a);
        }
    });
  };

  const handleNavigateToSearch = (categoryId: string) => {
    setSearchFilters({ category: categoryId, term: '' });
    setActiveTab('buscador');
  };

  const handleImportComplete = () => {
    setActiveTab('buscador');
    setSearchFilters({ category: 'cat-uncategorized', term: '' });
  };


  const renderContent = () => {
    switch(activeTab) {
        case 'dashboard':
            return <Dashboard transactions={filteredTransactions} onNavigateToSearch={handleNavigateToSearch} />;
        case 'importar':
            return <Import setActiveTab={setActiveTab} onImportComplete={handleImportComplete} />;
        case 'base':
            return <DatabaseView transactions={filteredTransactions} />;
        case 'comparacion':
            return <AccountComparisonView transactions={filteredTransactionsByDate} />;
        case 'analisis':
            return <BudgetsView selectedYears={selectedYears} month={month} selectedAccountId={selectedAccountId} />;
        case 'buscador':
            return <SearchView transactions={filteredTransactions} filters={searchFilters} onFiltersChange={setSearchFilters} />;
        case 'backup':
            return <BackupView setActiveTab={setActiveTab}/>;
        case 'settings':
            return <SettingsView />;
        default:
            return <Dashboard transactions={filteredTransactions} onNavigateToSearch={handleNavigateToSearch} />;
    }
  }

  const loadingFallback = (
    <div className="flex justify-center items-center p-20">
        <SpinnerIcon className="w-12 h-12 text-violet-400 animate-spin" />
    </div>
  );
  
  const showFilters = !['settings', 'importar', 'backup'].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-900 text-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Panel de Presupuesto</h1>
        </header>

        <nav className="mb-6 flex space-x-2 border-b border-slate-700 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} 
                    className={`px-4 py-2 font-medium text-lg transition-colors duration-200 whitespace-nowrap ${activeTab === tab.id ? 'text-violet-400 border-b-2 border-violet-400' : 'text-gray-400 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
        
        {showFilters && (
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
                {availableYears.map(y => (
                    <button key={y} onClick={() => handleYearToggle(y)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${selectedYears.includes(y) ? 'bg-violet-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>
                        {y}
                    </button>
                ))}
            </div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <button onClick={() => setMonth('all')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${month === 'all' ? 'bg-pink-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>Anual</button>
                {months.map((m, i) => <button key={m} onClick={() => setMonth(i)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${month === i ? 'bg-pink-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>{m}</button>)}
            </div>
             {['dashboard', 'base', 'analisis', 'buscador'].includes(activeTab) && accounts.length > 0 && (
                <div className="flex items-center space-x-2 flex-wrap gap-y-2 border-t border-slate-700 pt-4 mt-2">
                    <button onClick={() => setSelectedAccountId('all')} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${selectedAccountId === 'all' ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>Todas las Cuentas</button>
                    {accounts.map(acc => <button key={acc.id} onClick={() => setSelectedAccountId(acc.id)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-all duration-200 ${selectedAccountId === acc.id ? 'bg-sky-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'}`}>{acc.accountName}</button>)}
                </div>
            )}
          </div>
        )}

        <main>
            <Suspense fallback={loadingFallback}>
              {renderContent()}
            </Suspense>
        </main>
      </div>
    </div>
  );
};

export default MainApp;