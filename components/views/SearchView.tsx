import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { SearchIcon, XIcon, PencilIcon, TrashIcon, SparklesIcon } from '../icons';
import { Transaction, TransactionType } from '../../types';
import AddTransactionModal from '../modals/AddTransactionModal';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: Date) => new Date(date).toLocaleDateString('es-ES');

type SortableKeys = keyof Transaction | 'accountName' | 'categoryName';

interface SearchViewProps {
    transactions: Transaction[];
    filters: { category: string; term: string; }; // category is now categoryId
    onFiltersChange: (newFilters: { category: string; term: string; }) => void;
}

const SearchView: React.FC<SearchViewProps> = ({ transactions, filters, onFiltersChange }) => {
    const { categories, accounts, handleDeleteTransaction, getCategoryWithDescendants, automationRules } = useAppContext();
    const { confirm } = useModal();
    const { addToast } = useToast();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const accountNameMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.accountName])), [accounts]);
    const categoryNameMap = useMemo(() => new Map(categories.map(cat => [cat.id, cat.name])), [categories]);
    const ruleMap = useMemo(() => new Map(automationRules.map(rule => [rule.id, rule])), [automationRules]);
    
    const getAccountName = (accountId: string) => accountNameMap.get(accountId) || 'Cuenta Desconocida';
    const getCategoryName = (categoryId: string) => categoryNameMap.get(categoryId) || 'Categoría Desconocida';

    const handleClearSearch = () => onFiltersChange({ category: 'all', term: '' });
    const handleEdit = (transaction: Transaction) => { setTransactionToEdit(transaction); setIsModalOpen(true); };
    const handleDelete = async (id: string, description: string) => {
        const confirmed = await confirm('Confirmar Eliminación', `¿Estás seguro de que quieres eliminar la transacción "${description}"?`);
        if (confirmed) { handleDeleteTransaction(id); addToast({ type: 'success', message: 'Transacción eliminada.' }); }
    };
    
    const requestSort = (key: SortableKeys) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const getSortIndicator = (key: SortableKeys) => (sortConfig.key === key) ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : null;

    const searchResults = useMemo(() => {
        const trimmedSearchTerm = filters.term.trim();
        if (filters.category === 'all' && !trimmedSearchTerm) return [];

        let filtered = transactions;

        if (filters.category !== 'all') {
            const categoryIdsToFilter = getCategoryWithDescendants(filters.category);
            filtered = filtered.filter(t => categoryIdsToFilter.includes(t.categoryId));
        }

        if (trimmedSearchTerm) {
            const lowercasedTerm = trimmedSearchTerm.toLowerCase();
            filtered = filtered.filter(t => t.description.toLowerCase().includes(lowercasedTerm) || (t.notes && t.notes.toLowerCase().includes(lowercasedTerm)));
        }
        
        return filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            if (sortConfig.key === 'accountName') aValue = getAccountName(a.accountId);
            else if (sortConfig.key === 'categoryName') aValue = getCategoryName(a.categoryId);
            else aValue = a[sortConfig.key as keyof Transaction];

            if (sortConfig.key === 'accountName') bValue = getAccountName(b.accountId);
            else if (sortConfig.key === 'categoryName') bValue = getCategoryName(b.categoryId);
            else bValue = b[sortConfig.key as keyof Transaction];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    }, [filters.category, filters.term, transactions, sortConfig, getAccountName, getCategoryName, getCategoryWithDescendants]);

    const resultMetrics = useMemo(() => {
        const total = searchResults.reduce((sum, t) => t.type === TransactionType.EXPENSE ? sum - t.amount : sum + t.amount, 0);
        return { total, count: searchResults.length, average: searchResults.length > 0 ? total / searchResults.length : 0 };
    }, [searchResults]);

    const renderCategoryOptions = () => {
        const rootCategories = categories.filter(c => c.parentId === null && c.id !== 'cat-uncategorized').sort((a,b) => a.name.localeCompare(b.name));
        const options: React.ReactElement[] = [<option key="all" value="all">Todas las Categorías</option>];
        rootCategories.forEach(root => {
            options.push(<option key={root.id} value={root.id} className="font-bold">{root.name}</option>);
            const children = categories.filter(c => c.parentId === root.id).sort((a,b) => a.name.localeCompare(b.name));
            children.forEach(child => {
                 options.push(<option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;{child.name}</option>);
            });
        });
        return options;
    };

    const isSearchActive = filters.category !== 'all' || filters.term.trim() !== '';

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Buscador de Transacciones</h2>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="w-full md:w-1/3"><select value={filters.category} onChange={e => onFiltersChange({ ...filters, category: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500 h-full">{renderCategoryOptions()}</select></div>
                    <div className="relative w-full md:w-2/3"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-400" /></div><input type="text" placeholder="Buscar por descripción o anotaciones..." value={filters.term} onChange={e => onFiltersChange({ ...filters, term: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-4 text-white focus:ring-violet-500 focus:border-violet-500"/></div>
                </div>
            </div>

            {isSearchActive && (
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg animate-fade-in">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <h3 className="text-xl font-semibold text-violet-300">Resultados de la Búsqueda</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={handleClearSearch} className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white"><XIcon className="w-4 h-4" /><span>Limpiar Búsqueda</span></button>
                        </div>
                    </div>
                    {searchResults.length > 0 ? (
                        <><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-700/50 p-4 rounded-lg text-center"><p className="text-sm text-gray-400">Balance Total</p><p className={`text-2xl font-bold ${resultMetrics.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(resultMetrics.total)}</p></div>
                            <div className="bg-slate-700/50 p-4 rounded-lg text-center"><p className="text-sm text-gray-400">N.º de Transacciones</p><p className="text-2xl font-bold">{resultMetrics.count}</p></div>
                            <div className="bg-slate-700/50 p-4 rounded-lg text-center"><p className="text-sm text-gray-400">Balance Promedio</p><p className={`text-2xl font-bold ${resultMetrics.average >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(resultMetrics.average)}</p></div>
                        </div>
                        <div className="overflow-x-auto"><table className="w-full text-left">
                            <thead><tr className="border-b border-slate-700 text-sm text-gray-400">
                                <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('date')}>Fecha{getSortIndicator('date')}</th>
                                <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('description')}>Descripción{getSortIndicator('description')}</th>
                                <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('accountName')}>Cuenta{getSortIndicator('accountName')}</th>
                                <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => requestSort('amount')}>Monto{getSortIndicator('amount')}</th>
                                <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('categoryName')}>Categoría{getSortIndicator('categoryName')}</th>
                                <th className="p-3">Acciones</th>
                            </tr></thead>
                            <tbody>{searchResults.map(t => (<tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                <td className="p-3">{formatDate(t.date)}</td>
                                <td className="p-3">{t.description}{t.notes && <p className="text-xs text-gray-400 italic mt-1">{t.notes}</p>}</td>
                                <td className="p-3 text-xs text-gray-400">{getAccountName(t.accountId)}</td>
                                <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <span>{getCategoryName(t.categoryId)}</span>
                                        {t.automatedByRuleId && (
                                            <span title={`Categorizado por la regla: "${ruleMap.get(t.automatedByRuleId)?.keyword}"`}>
                                                <SparklesIcon className="w-4 h-4 text-violet-400" />
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3"><div className="flex items-center space-x-3"><button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button><button onClick={() => handleDelete(t.id, t.description)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button></div></td>
                            </tr>))}</tbody>
                        </table></div></>
                    ) : (<p className="text-center text-gray-500 py-8">No se encontraron transacciones que coincidan con tu búsqueda.</p>)}
                </div>
            )}
            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} transactionToEdit={transactionToEdit} />
            <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }`}</style>
        </div>
    );
};
export default SearchView;