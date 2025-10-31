import React, { useState } from 'react';
import Dashboard from './Dashboard';
import ImportView from './Import';
import DatabaseView from './views/DatabaseView';
import BackupView from './views/BackupView';
import SettingsView from './views/SettingsView';
import { useAppContext } from '../contexts/AppContext';
import { PiggyBankIcon, UploadCloudIcon, SearchIcon, FileDownIcon, TargetIcon } from './icons';

const MainApp: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'importar' | 'base' | 'backup' | 'settings'>('dashboard');
    const { allTransactions } = useAppContext();

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard transactions={allTransactions} />;
            case 'importar':
                return <ImportView />;
            case 'base':
                return <DatabaseView transactions={allTransactions} />;
            case 'backup':
                return <BackupView setActiveTab={setActiveTab} />;
            case 'settings':
                return <SettingsView />;
            default:
                return <Dashboard transactions={allTransactions} />;
        }
    };

    const NavLink: React.FC<{
        tabName: 'dashboard' | 'importar' | 'base' | 'backup' | 'settings';
        icon: React.ReactNode;
        label: string;
    }> = ({ tabName, icon, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center space-x-3 p-3 rounded-lg w-full text-left transition-colors ${
                activeTab === tabName
                    ? 'bg-violet-600 text-white font-semibold'
                    : 'text-gray-400 hover:bg-slate-700 hover:text-white'
            }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-gray-200 flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-slate-800 p-4 flex flex-col border-b md:border-b-0 md:border-r border-slate-700">
                <div className="flex items-center space-x-2 p-3 mb-4">
                    <PiggyBankIcon className="w-8 h-8 text-violet-400" />
                    <span className="text-xl font-bold">BudgetPanel</span>
                </div>
                <nav className="flex flex-row md:flex-col md:space-y-2 overflow-x-auto md:overflow-x-visible">
                    <NavLink tabName="dashboard" icon={<TargetIcon className="w-5 h-5" />} label="Dashboard" />
                    <NavLink tabName="importar" icon={<UploadCloudIcon className="w-5 h-5" />} label="Importar" />
                    <NavLink tabName="base" icon={<SearchIcon className="w-5 h-5" />} label="Base de Datos" />
                    <NavLink tabName="backup" icon={<FileDownIcon className="w-5 h-5" />} label="Copia de Seguridad" />
                    <NavLink tabName="settings" icon={<PiggyBankIcon className="w-5 h-5" />} label="Configuración" />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};

export default MainApp;
