import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import AddTransactionModal from '../modals/AddTransactionModal';
import { PencilIcon, TrashIcon, PlusCircleIcon, ChevronLeftIcon, ChevronRightIcon, FileDownIcon, FileTextIcon, FileSpreadsheetIcon } from '../icons';

// Declarar tipos de ventana para librerías de CDN para satisfacer a TypeScript
declare global {
  interface Window {
    XLSX: any;
    jspdf: {
        jsPDF: any;
    };
  }
}

const ITEMS_PER_PAGE = 10;

const DatabaseView: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
    const { handleDeleteTransaction, accounts } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    const accountNameMap = useMemo(() => new Map(accounts.map(acc => [acc.id, acc.accountName])), [accounts]);
    const getAccountName = (accountId: string) => accountNameMap.get(accountId) || 'Cuenta Desconocida';

    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [transactions, currentPage]);

    const handleEdit = (transaction: Transaction) => {
        setTransactionToEdit(transaction);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setTransactionToEdit(undefined);
        setIsModalOpen(true);
    };
    
    const handleDelete = (id: string, description: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la transacción "${description}"?`)) {
            handleDeleteTransaction(id);
        }
    };
    
    const formatCurrency = (value: number) => `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('es-ES');

    // --- MANEJADORES DE EXPORTACIÓN ---
    const handleExportCSV = () => {
        const headers = ['Fecha', 'Descripción', 'Monto', 'Tipo', 'Categoría', 'Cuenta'];
        const rows = transactions.map(t => [
            new Date(t.date).toLocaleDateString('es-ES'),
            `"${t.description.replace(/"/g, '""')}"`,
            t.amount.toString().replace('.', ','),
            t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto',
            t.category,
            getAccountName(t.accountId)
        ]);
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Added BOM for Excel compatibility
            + headers.join(',') + '\n' 
            + rows.map(e => e.join(',')).join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transacciones.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportMenuOpen(false);
    };

    const handleExportXLSX = () => {
        if (typeof window.XLSX === 'undefined') {
            alert('Error: La librería de exportación a Excel no se ha cargado. Por favor, revisa tu conexión a internet y refresca la página.');
            return;
        }
        const dataToExport = transactions.map(t => ({
            'Fecha': new Date(t.date).toLocaleDateString('es-ES'),
            'Descripción': t.description,
            'Monto': t.amount,
            'Tipo': t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto',
            'Categoría': t.category,
            'Cuenta': getAccountName(t.accountId)
        }));

        const ws = window.XLSX.utils.json_to_sheet(dataToExport);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
        window.XLSX.writeFile(wb, "transacciones.xlsx");
        setIsExportMenuOpen(false);
    };

    const handleExportPDF = () => {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            alert('Error: La librería de exportación a PDF no se ha cargado. Por favor, revisa tu conexión a internet y refresca la página.');
            return;
        }
    
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
    
        if (typeof (doc as any).autoTable !== 'function') {
            alert('Error: El plugin para tablas PDF (autoTable) no se ha cargado. Por favor, revisa tu conexión a internet y refresca la página.');
            return;
        }
    
        doc.text("Reporte de Transacciones", 14, 16);
    
        const tableColumn = ["Fecha", "Descripción", "Monto", "Tipo", "Categoría", "Cuenta"];
        const tableRows = transactions.map(t => [
            new Date(t.date).toLocaleDateString('es-ES'),
            t.description,
            `${t.type === TransactionType.INCOME ? '+' : '-'} ${formatCurrency(t.amount)}`,
            t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto',
            t.category,
            getAccountName(t.accountId)
        ]);
    
        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
        });
    
        doc.save("transacciones.pdf");
        setIsExportMenuOpen(false);
    };


    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h2 className="text-2xl font-semibold">Base de Datos de Transacciones</h2>
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            <FileDownIcon className="w-5 h-5" />
                            <span>Exportar</span>
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 origin-top-right bg-slate-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <button onClick={handleExportCSV} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-200 hover:bg-slate-600" role="menuitem">
                                        <FileTextIcon className="w-4 h-4" />
                                        <span>Exportar como CSV</span>
                                    </button>
                                    <button onClick={handleExportXLSX} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-200 hover:bg-slate-600" role="menuitem">
                                        <FileSpreadsheetIcon className="w-4 h-4" />
                                        <span>Exportar como Excel (XLSX)</span>
                                    </button>
                                    <button onClick={handleExportPDF} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-200 hover:bg-slate-600" role="menuitem">
                                        <FileTextIcon className="w-4 h-4" />
                                        <span>Exportar como PDF</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleAdd} className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        <PlusCircleIcon className="w-5 h-5" />
                        <span>Añadir Transacción</span>
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700 text-sm text-gray-400">
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Descripción</th>
                            <th className="p-3">Cuenta</th>
                            <th className="p-3 text-right">Monto</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Categoría</th>
                            <th className="p-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.length > 0 ? paginatedTransactions.map(t => (
                            <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                                <td className="p-3">{formatDate(t.date)}</td>
                                <td className="p-3">{t.description}</td>
                                <td className="p-3 text-xs text-gray-400">{getAccountName(t.accountId)}</td>
                                <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {t.type === TransactionType.INCOME ? '+' : '-'} {formatCurrency(t.amount)}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.type === TransactionType.INCOME ? 'bg-emerald-900/50 text-emerald-300' : 'bg-rose-900/50 text-rose-300'}`}>
                                        {t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}
                                    </span>
                                </td>
                                <td className="p-3">{t.category}</td>
                                <td className="p-3">
                                    <div className="flex items-center space-x-3">
                                        <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-violet-400" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(t.id, t.description)} className="text-gray-400 hover:text-rose-500" title="Eliminar"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center p-8 text-gray-500">No hay transacciones que mostrar.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronLeftIcon className="w-4 h-4"/> <span>Anterior</span>
                    </button>
                    <span className="text-sm text-gray-400">Página {currentPage} de {totalPages}</span>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center space-x-2 px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span>Siguiente</span> <ChevronRightIcon className="w-4 h-4"/>
                    </button>
                </div>
            )}

            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} transactionToEdit={transactionToEdit} />
        </div>
    );
};

export default DatabaseView;