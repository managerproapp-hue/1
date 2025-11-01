import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { PencilIcon, TrashIcon, SparklesIcon } from '../icons';
import { Transaction, TransactionType } from '../../types';
import AddTransactionModal from '../modals/AddTransactionModal';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';

const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (date: Date) => new Date(date).toLocaleDateString('es-ES');

type SortableKeys = keyof Transaction | 'accountName';

interface UncategorizedViewProps {
    transactions: Transaction[];
    onNavigateToRules: () => void;
}

const UncategorizedView: React.FC<UncategorizedViewProps> = ({ transactions, onNavigateToRules }) => {
    const { accounts, handleDeleteTransaction, handleReapplyAutomationRules, automationRules } = useAppContext();
    const { confirm } = useModal();
    const { addToast } = useToast();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const accountNameMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.accountName])), [accounts]);
    const ruleMap = useMemo(() => new Map(automationRules.map(rule => [rule.id, rule])), [automationRules]);
    
    const getAccountName = (accountId: string) => accountNameMap.get(accountId) || 'Cuenta Desconocida';

    const handleEdit = (transaction: Transaction) => { setTransactionToEdit(transaction); setIsModalOpen(true); };
    const handleDelete = async (id: string, description: string) => {
        const confirmed = await confirm('Confirmar Eliminación', `¿Estás seguro de que quieres eliminar la transacción "${description}"?`);
        if (confirmed) { handleDeleteTransaction(id); addToast({ type: 'success', message: 'Transacción eliminada.' }); }
    };
    
    const requestSort = (key: SortableKeys) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const getSortIndicator = (key: SortableKeys) => (sortConfig.key === key) ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : null;

    const uncategorizedTransactions = useMemo(() => {
        let filtered = transactions.filter(t => t.categoryId === 'cat-uncategorized');
        
        return filtered.sort((a, b) => {
            let aValue: any, bValue: any;
            if (sortConfig.key === 'accountName') aValue = getAccountName(a.accountId);
            else aValue = a[sortConfig.key as keyof Transaction];

            if (sortConfig.key === 'accountName') bValue = getAccountName(b.accountId);
            else bValue = b[sortConfig.key as keyof Transaction];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, sortConfig, getAccountName]);

    const handleReapplyRulesClick = () => {
        const transactionIdsToProcess = uncategorizedTransactions.map(t => t.id);
        if (transactionIdsToProcess.length === 0) { 
            addToast({ type: 'info', message: 'No hay transacciones en la vista actual para procesar.' }); 
            return; 
        }
        
        const { updatedCount, matchedButAlreadyCategorized } = handleReapplyAutomationRules(transactionIdsToProcess);

        if (updatedCount > 0) {
            addToast({ type: 'success', message: `${updatedCount} transacciones han sido re-categorizadas.` });
        } else {
            if (matchedButAlreadyCategorized > 0) {
                 addToast({ type: 'info', message: `Se encontraron ${matchedButAlreadyCategorized} coincidencias, pero ya estaban en la categoría correcta.` });
            } else {
                 addToast({ type: 'info', message: 'No se encontraron coincidencias con tus reglas para estas transacciones.' });
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-2xl font-semibold">Transacciones Sin Categorizar</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={handleReapplyRulesClick} className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-sm font-semibold py-2 px-3 rounded-lg"><SparklesIcon className="w-4 h-4" /><span>Re-aplicar Reglas</span></button>
                         <button onClick={onNavigateToRules} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold py-2 px-3 rounded-lg"><SparklesIcon className="w-4 h-4" /><span>Gestionar Reglas</span></button>
                    </div>
                </div>
               
                {uncategorizedTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700 text-sm text-gray-400">
                                    <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('date')}>Fecha{getSortIndicator('date')}</th>
                                    <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('description')}>Descripción{getSortIndicator('description')}</th>
                                    <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('accountName')}>Cuenta{getSortIndicator('accountName')}</th>
                                    <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => requestSort('amount')}>Monto{getSortIndicator('amount')}</th>
                                    <th className="p-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uncategorizedTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                        <td className="p-3">{formatDate(t.date)}</td>
                                        <td className="p-3">{t.description}</td>
                                        <td className="p-3 text-xs text-gray-400">{getAccountName(t.accountId)}</td>
                                        <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center space-x-3">
                                                <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-violet-400" title="Editar y Categorizar"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(t.id, t.description)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">¡Felicidades! Todas tus transacciones están categorizadas.</p>
                )}
            </div>
            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} transactionToEdit={transactionToEdit} />
        </div>
    );
};
export default UncategorizedView;