import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import AddTransactionModal from '../modals/AddTransactionModal';
import { PencilIcon, TrashIcon, PlusCircleIcon, ChevronLeftIcon, ChevronRightIcon, FileDownIcon, FileTextIcon, FileSpreadsheetIcon, SparklesIcon } from '../icons';

declare global {
  interface Window {
    XLSX: any;
    jspdf: { jsPDF: any; };
  }
}

const ITEMS_PER_PAGE = 10;
type SortableKeys = keyof Transaction | 'accountName' | 'categoryName';

const DatabaseView: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const { handleDeleteTransaction, accounts, categories, handleReapplyAutomationRules, automationRules } = useAppContext();
    const { confirm } = useModal();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    const accountNameMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.accountName])), [accounts]);
    const categoryNameMap = useMemo(() => new Map(categories.map(cat => [cat.id, cat.name])), [categories]);
    
    const getAccountName = (accountId: string) => accountNameMap.get(accountId) || 'Cuenta Desconocida';
    const getCategoryName = (categoryId: string) => categoryNameMap.get(categoryId) || 'Categoría Desconocida';
    
    const sortedTransactions = useMemo(() => {
        let sortableItems = [...transactions];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
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
        }
        return sortableItems;
    }, [transactions, sortConfig, getAccountName, getCategoryName]);

    const lastTransactionDate = useMemo(() => sortedTransactions.length > 0 ? sortedTransactions[0].date : null, [sortedTransactions]);
    const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => sortedTransactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [sortedTransactions, currentPage]);

    const requestSort = (key: SortableKeys) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
        setCurrentPage(1);
    };

    const getSortIndicator = (key: SortableKeys) => (sortConfig.key === key) ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : null;

    const handleEdit = (transaction: Transaction) => { setTransactionToEdit(transaction); setIsModalOpen(true); };
    const handleAdd = () => { setTransactionToEdit(undefined); setIsModalOpen(true); };
    
    const handleDelete = async (id: string, description: string) => {
        const confirmed = await confirm('Confirmar Eliminación', `¿Estás seguro de que quieres eliminar la transacción "${description}"?`);
        if (confirmed) { handleDeleteTransaction(id); addToast({ type: 'success', message: 'Transacción eliminada.' }); }
    };

    const handleReapplyRulesClick = async () => {
        if (automationRules.length === 0) {
            addToast({ type: 'info', message: 'No has creado ninguna regla de automatización.' });
            return;
        }
        if (transactions.length === 0) {
            addToast({ type: 'info', message: 'No hay transacciones en la vista para aplicar reglas.' });
            return;
        }
        
        const confirmed = await confirm(
            'Re-aplicar Reglas',
            `Esto intentará re-categorizar las ${transactions.length} transacciones visibles en esta página según tus reglas actuales. ¿Estás seguro?`
        );

        if (confirmed) {
            const transactionIdsToProcess = transactions.map(t => t.id);
            const { updatedCount, matchedButAlreadyCategorized } = handleReapplyAutomationRules(transactionIdsToProcess);

            if (updatedCount > 0) {
                addToast({ type: 'success', message: `${updatedCount} transacciones han sido re-categorizadas.` });
            } else {
                if (matchedButAlreadyCategorized > 0) {
                    addToast({ type: 'info', message: `Se encontraron ${matchedButAlreadyCategorized} coincidencias, pero ya estaban en la categoría correcta.` });
                } else {
                    addToast({ type: 'info', message: 'No se encontraron nuevas transacciones para actualizar con las reglas actuales.' });
                }
            }
        }
    };
    
    const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('es-ES');

    const handleExportXLSX = () => {
        if (typeof window.XLSX === 'undefined') { addToast({ type: 'error', message: 'La librería de exportación a Excel no se ha cargado.' }); return; }
        const sheetData = transactions.map(t => ({ 'Fecha': new Date(t.date).toLocaleDateString('es-ES'), 'Descripción': t.description, 'Monto': t.type === TransactionType.EXPENSE ? -t.amount : t.amount, 'Tipo': t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto', 'Categoría': getCategoryName(t.categoryId), 'Cuenta': getAccountName(t.accountId), 'Notas': t.notes || '' }));
        const ws = window.XLSX.utils.json_to_sheet(sheetData);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
        window.XLSX.writeFile(wb, "transacciones.xlsx"); setIsExportMenuOpen(false);
    };

    const handleExportPDF = () => {
        if (typeof window.jspdf?.jsPDF === 'undefined') { addToast({ type: 'error', message: 'La librería de exportación a PDF no se ha cargado.' }); return; }
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        if (typeof (doc as any).autoTable !== 'function') { addToast({ type: 'error', message: 'El plugin para tablas PDF (autoTable) no se ha cargado.' }); return; }
        doc.text("Reporte de Transacciones", 14, 16);
        (doc as any).autoTable({
            head: [["Fecha", "Descripción", "Monto", "Tipo", "Categoría", "Cuenta"]],
            body: transactions.map(t => [ new Date(t.date).toLocaleDateString('es-ES'), t.description, `${t.type === TransactionType.EXPENSE ? '-' : '+'}${formatCurrency(t.amount)}`, t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto', getCategoryName(t.categoryId), getAccountName(t.accountId) ]),
            startY: 20, theme: 'grid', headStyles: { fillColor: [79, 70, 229] },
        });
        doc.save("transacciones.pdf"); setIsExportMenuOpen(false);
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-semibold">Base de Datos de Transacciones</h2>
                    {lastTransactionDate && <p className="text-sm text-gray-400 mt-1">Último movimiento: {formatDate(lastTransactionDate)}</p>}
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleReapplyRulesClick} className="flex items-center space-x-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg">
                        <SparklesIcon className="w-5 h-5" />
                        <span>Re-aplicar Reglas</span>
                    </button>
                    <div className="relative">
                        <button onClick={() => setIsExportMenuOpen(p => !p)} className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg"><FileDownIcon className="w-5 h-5" /><span>Exportar</span></button>
                        {isExportMenuOpen && <div className="absolute right-0 mt-2 w-56 origin-top-right bg-slate-700 rounded-md shadow-lg z-10">
                            <div className="py-1"><button onClick={handleExportXLSX} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm hover:bg-slate-600"><FileSpreadsheetIcon className="w-4 h-4" /><span>Exportar como Excel</span></button><button onClick={handleExportPDF} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm hover:bg-slate-600"><FileTextIcon className="w-4 h-4" /><span>Exportar como PDF</span></button></div>
                        </div>}
                    </div>
                    <button onClick={handleAdd} className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg"><PlusCircleIcon className="w-5 h-5" /><span>Añadir Transacción</span></button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="border-b border-slate-700 text-sm text-gray-400">
                        <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('date')}>Fecha{getSortIndicator('date')}</th>
                        <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('description')}>Descripción{getSortIndicator('description')}</th>
                        <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('accountName')}>Cuenta{getSortIndicator('accountName')}</th>
                        <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => requestSort('amount')}>Monto{getSortIndicator('amount')}</th>
                        <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('type')}>Tipo{getSortIndicator('type')}</th>
                        <th className="p-3 cursor-pointer hover:text-white" onClick={() => requestSort('categoryName')}>Categoría{getSortIndicator('categoryName')}</th>
                        <th className="p-3">Acciones</th>
                    </tr></thead>
                    <tbody>
                        {paginatedTransactions.length > 0 ? paginatedTransactions.map(t => (
                            <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                <td className="p-3">{formatDate(t.date)}</td>
                                <td className="p-3">{t.description}{t.notes && <p className="text-xs text-gray-400 italic mt-1">{t.notes}</p>}</td>
                                <td className="p-3 text-xs text-gray-400">{getAccountName(t.accountId)}</td>
                                <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.type === TransactionType.INCOME ? 'bg-emerald-900/50 text-emerald-300' : 'bg-rose-900/50 text-rose-300'}`}>{t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}</span></td>
                                <td className="p-3">{getCategoryName(t.categoryId)}</td>
                                <td className="p-3"><div className="flex items-center space-x-3"><button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button><button onClick={() => handleDelete(t.id, t.description)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button></div></td>
                            </tr>
                        )) : (<tr><td colSpan={7} className="text-center p-8 text-gray-500">No hay transacciones.</td></tr>)}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && <div className="flex justify-between items-center mt-4">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50"><ChevronLeftIcon className="w-4 h-4"/><span>Anterior</span></button>
                <span className="text-sm text-gray-400">Página {currentPage} de {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50"><span>Siguiente</span><ChevronRightIcon className="w-4 h-4"/></button>
            </div>}
            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} transactionToEdit={transactionToEdit} />
        </div>
    );
};

export default DatabaseView;