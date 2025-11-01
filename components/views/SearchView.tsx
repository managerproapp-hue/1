import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { SearchIcon, XIcon, PencilIcon, TrashIcon } from '../icons';
import { Transaction, TransactionType } from '../../types';
import AddTransactionModal from '../modals/AddTransactionModal';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: Date) => new Date(date).toLocaleDateString('es-ES');

type SortableKeys = keyof Transaction | 'accountName';

const SearchView: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const { expenseCategories, incomeCategories, accounts, handleDeleteTransaction } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const accountNameMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.accountName])), [accounts]);
    const getAccountName = (accountId: string) => accountNameMap.get(accountId) || 'Cuenta Desconocida';

    const allCategories = useMemo(() => {
        return [...new Set([...expenseCategories, ...incomeCategories])].sort();
    }, [expenseCategories, incomeCategories]);
    
    const handleClearSearch = () => {
        setSearchTerm('');
        setSelectedCategory('all');
    };

    const handleEdit = (transaction: Transaction) => {
        setTransactionToEdit(transaction);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string, description: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la transacción "${description}"?`)) {
            handleDeleteTransaction(id);
        }
    };
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };


    const searchResults = useMemo(() => {
        const trimmedSearchTerm = searchTerm.trim();
        if (selectedCategory === 'all' && !trimmedSearchTerm) {
            return []; // No mostrar resultados si no hay búsqueda activa
        }

        let filtered = transactions;

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }

        if (trimmedSearchTerm) {
            const lowercasedTerm = trimmedSearchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(lowercasedTerm) ||
                (t.notes && t.notes.toLowerCase().includes(lowercasedTerm))
            );
        }
        
        // Apply sorting
        return filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'accountName') {
                aValue = getAccountName(a.accountId);
                bValue = getAccountName(b.accountId);
            } else {
                aValue = a[sortConfig.key as keyof Transaction];
                bValue = b[sortConfig.key as keyof Transaction];
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

    }, [selectedCategory, searchTerm, transactions, sortConfig, getAccountName]);

    const resultMetrics = useMemo(() => {
        if (searchResults.length === 0) {
            return { total: 0, count: 0, average: 0 };
        }
        const total = searchResults.reduce((sum, t) => {
            if (t.type === TransactionType.EXPENSE) return sum - t.amount;
            if (t.type === TransactionType.INCOME) return sum + t.amount;
            return sum;
        }, 0);
        const count = searchResults.length;
        const average = searchResults.length > 0 ? total / searchResults.length : 0;

        return { total, count, average };
    }, [searchResults]);

    const isSearchActive = selectedCategory !== 'all' || searchTerm.trim() !== '';

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Buscador de Transacciones</h2>
                <div className="flex flex-col md:flex-row gap-4 items-center">
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-400">Balance Total</p>
                                    <p className={`text-2xl font-bold ${resultMetrics.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(resultMetrics.total)}</p>
                                </div>
                                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-400">N.º de Transacciones</p>
                                    <p className="text-2xl font-bold">{resultMetrics.count}</p>
                                </div>
                                <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-400">Balance Promedio</p>
                                    <p className={`text-2xl font-bold ${resultMetrics.average >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(resultMetrics.average)}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-700 text-sm text-gray-400">
                                            <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('date')}>Fecha{getSortIndicator('date')}</th>
                                            <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('description')}>Descripción{getSortIndicator('description')}</th>
                                            <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('accountName')}>Cuenta{getSortIndicator('accountName')}</th>
                                            <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => requestSort('amount')}>Monto{getSortIndicator('amount')}</th>
                                            <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('category')}>Categoría{getSortIndicator('category')}</th>
                                            <th className="p-3">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searchResults.map(t => (
                                            <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                                <td className="p-3">{formatDate(t.date)}</td>
                                                <td className="p-3">
                                                    {t.description}
                                                    {t.notes && <p className="text-xs text-gray-400 italic mt-1">{t.notes}</p>}
                                                </td>
                                                <td className="p-3 text-xs text-gray-400">{getAccountName(t.accountId)}</td>
                                                <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                                </td>
                                                <td className="p-3">{t.category}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center space-x-3">
                                                        <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDelete(t.id, t.description)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No se encontraron transacciones que coincidan con tu búsqueda.</p>
                    )}
                </div>
            )}
            <AddTransactionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                transactionToEdit={transactionToEdit} 
            />
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