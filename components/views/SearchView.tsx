import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { SearchIcon, XIcon } from '../icons';
import { Transaction, TransactionType } from '../../types';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: Date) => new Date(date).toLocaleDateString('es-ES');

const SearchView: React.FC = () => {
    const { allTransactions, expenseCategories, incomeCategories, accounts } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const accountNameMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.accountName])), [accounts]);

    const allCategories = useMemo(() => {
        return [...new Set([...expenseCategories, ...incomeCategories])].sort();
    }, [expenseCategories, incomeCategories]);
    
    const handleClearSearch = () => {
        setSearchTerm('');
        setSelectedCategory('all');
    };

    const searchResults = useMemo(() => {
        const trimmedSearchTerm = searchTerm.trim();
        if (selectedCategory === 'all' && !trimmedSearchTerm) {
            return []; // No mostrar resultados si no hay búsqueda activa
        }

        let filtered = allTransactions;

        // 1. Filtrar por categoría
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }

        // 2. Filtrar por término de búsqueda en descripción o notas
        if (trimmedSearchTerm) {
            const lowercasedTerm = trimmedSearchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(lowercasedTerm) ||
                (t.notes && t.notes.toLowerCase().includes(lowercasedTerm))
            );
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedCategory, searchTerm, allTransactions]);

    const resultMetrics = useMemo(() => {
        if (searchResults.length === 0) {
            return { total: 0, count: 0, average: 0 };
        }
        const total = searchResults.reduce((sum, t) => sum + t.amount, 0);
        const count = searchResults.length;
        const average = total / count;
        return { total, count, average };
    }, [searchResults]);

    const isSearchActive = selectedCategory !== 'all' || searchTerm.trim() !== '';

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Buscador de Transacciones</h2>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    {/* Desplegable de Categorías */}
                    <div className="w-full md:w-1/3">
                         <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500 h-full"
                        >
                            <option value="all">Todas las Categorías</option>
                            {allCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Barra de Búsqueda */}
                    <div className="relative w-full md:w-2/3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por descripción o anotaciones..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>
                </div>
            </div>

            {isSearchActive && (
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-violet-300">Resultados de la Búsqueda</h3>
                        <button onClick={handleClearSearch} className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white">
                            <XIcon className="w-4 h-4" />
                            <span>Limpiar Búsqueda</span>
                        </button>
                    </div>

                    {searchResults.length > 0 ? (
                        <>
                            {/* --- Métricas Clave --- */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-400">Total Encontrado</p>
                                    <p className="text-2xl font-bold">{formatCurrency(resultMetrics.total)}</p>
                                </div>
                                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-400">N.º de Transacciones</p>
                                    <p className="text-2xl font-bold">{resultMetrics.count}</p>
                                </div>
                                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-400">Promedio</p>
                                    <p className="text-2xl font-bold">{formatCurrency(resultMetrics.average)}</p>
                                </div>
                            </div>

                            {/* --- Lista de Transacciones --- */}
                            <div className="max-h-96 overflow-y-auto">
                                <div className="space-y-2">
                                {searchResults.map(t => (
                                    <div key={t.id} className="p-3 bg-slate-700 rounded-md flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{t.description}</p>
                                            <p className="text-xs text-gray-400">{formatDate(t.date)} - {accountNameMap.get(t.accountId) || 'Cuenta Desconocida'}</p>
                                            {t.notes && <p className="text-xs text-gray-400 italic mt-1">{t.notes}</p>}
                                        </div>
                                        <p className={`font-semibold text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                        </p>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No se encontraron transacciones que coincidan con tu búsqueda.</p>
                    )}
                </div>
            )}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default SearchView;
