import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, TransactionType } from '../../types';
import { PlusCircleIcon, SearchIcon, PencilIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, FileDownIcon, FileTextIcon, FileSpreadsheetIcon } from '../icons';
import AddTransactionModal from '../modals/AddTransactionModal';
import { useAppContext } from '../../contexts/AppContext';

declare var XLSX: any;
declare var jsPDF: any;


interface DatabaseViewProps {
    transactions: Transaction[];
}

const ITEMS_PER_PAGE = 15;

const DatabaseView: React.FC<DatabaseViewProps> = ({ transactions }) => {
    const { handleDeleteTransaction } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'description' | 'category'>('description');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);
    const [currentPage, setCurrentPage] = useState(1);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const handleOpenAddModal = () => {
        setSelectedTransaction(undefined);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (transaction: Transaction) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTransaction(undefined);
    };

    const onDelete = (id: string, description: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la transacción: "${description}"?`)) {
            handleDeleteTransaction(id);
        }
    };

    const searchedTransactions = useMemo(() => {
        if (!searchQuery.trim()) return transactions;
        const lowercasedQuery = searchQuery.toLowerCase();
        return transactions.filter(t => {
            if (searchType === 'description') return t.description.toLowerCase().includes(lowercasedQuery);
            if (searchType === 'category') return t.category.toLowerCase().includes(lowercasedQuery);
            return false;
        });
    }, [transactions, searchQuery, searchType]);

    // Reset page to 1 when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, searchType, transactions]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const totalPages = Math.ceil(searchedTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return searchedTransactions.slice(startIndex, endIndex);
    }, [searchedTransactions, currentPage]);

    const exportToCSV = () => {
        const headers = ['Fecha', 'Descripción', 'Fuente', 'Categoría', 'Tipo', 'Monto'];
        const rows = searchedTransactions.map(t => [
            new Date(t.date).toLocaleDateString('es-ES'),
            `"${t.description.replace(/"/g, '""')}"`, // Handle quotes
            t.source || 'N/A',
            t.category,
            t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto',
            t.amount
        ].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "transacciones.csv");
        document.body.appendChild(link);
        link.click();
        link.remove();
        setIsExportMenuOpen(false);
    };

    const exportToXLSX = () => {
        const dataToExport = searchedTransactions.map(t => ({
            'Fecha': new Date(t.date).toLocaleDateString('es-ES'),
            'Descripción': t.description,
            'Fuente': t.source || 'N/A',
            'Categoría': t.category,
            'Tipo': t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto',
            'Monto': t.amount,
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transacciones");
        XLSX.writeFile(workbook, "transacciones.xlsx");
        setIsExportMenuOpen(false);
    };
    
    const exportToPDF = () => {
        const doc = new jsPDF.default();
        const tableColumn = ['Fecha', 'Descripción', 'Fuente', 'Categoría', 'Tipo', 'Monto (€)'];
        const tableRows: any[] = [];

        searchedTransactions.forEach(t => {
            const transactionData = [
                new Date(t.date).toLocaleDateString('es-ES'),
                t.description,
                t.source || 'N/A',
                t.category,
                t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto',
                t.amount.toFixed(2),
            ];
            tableRows.push(transactionData);
        });
        
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });
        doc.text("Listado de Transacciones", 14, 15);
        doc.save("transacciones.pdf");
        setIsExportMenuOpen(false);
    };

    return (
        <>
            <div className="bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-4">Base de Datos de Transacciones</h2>
                <div className="flex flex-wrap gap-4 mb-4">
                    <div className="flex-grow-[3] flex items-center gap-2">
                        <select id="search-type" value={searchType} onChange={(e) => setSearchType(e.target.value as any)} className="bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500 h-full w-full sm:w-auto">
                            <option value="description">Descripción</option>
                            <option value="category">Categoría</option>
                        </select>
                        <div className="flex-grow relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={`Buscar por ${searchType === 'description' ? 'descripción' : 'categoría'}...`} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-10 pr-3 text-white focus:ring-violet-500 focus:border-violet-500" />
                        </div>
                    </div>
                    <div className="flex-grow flex sm:flex-grow-0 items-center justify-end gap-2">
                        <button onClick={() => setSearchQuery('')} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">Limpiar</button>
                        <div className="relative" ref={exportMenuRef}>
                            <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                <FileDownIcon className="w-5 h-5"/>
                                <span>Exportar</span>
                            </button>
                            {isExportMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-md shadow-lg z-10 border border-slate-600">
                                    <button onClick={exportToCSV} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-slate-600 rounded-t-md">
                                        <FileTextIcon className="w-4 h-4" /> Exportar a CSV
                                    </button>
                                    <button onClick={exportToXLSX} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-slate-600">
                                        <FileSpreadsheetIcon className="w-4 h-4" /> Exportar a Excel
                                    </button>
                                    <button onClick={exportToPDF} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-slate-600 rounded-b-md">
                                        <FileTextIcon className="w-4 h-4" /> Exportar a PDF
                                    </button>
                                </div>
                            )}
                        </div>
                        <button onClick={handleOpenAddModal} className="flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            <PlusCircleIcon className="w-5 h-5"/>
                            <span>Añadir</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-600 text-sm text-gray-400">
                            <tr>
                                <th className="p-3">Fecha</th><th className="p-3">Descripción</th><th className="p-3">Fuente</th><th className="p-3">Categoría</th><th className="p-3">Tipo</th><th className="p-3 text-right">Monto</th><th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTransactions.length > 0 ? (
                                paginatedTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="p-3 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="p-3">{t.description}</td>
                                        <td className="p-3"><span className="bg-slate-600 text-gray-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">{t.source || 'N/A'}</span></td>
                                        <td className="p-3">{t.category}</td>
                                        <td className={`p-3 font-medium ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}</td>
                                        <td className={`p-3 text-right font-mono ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : ''}€{t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center space-x-2">
                                                <button onClick={() => handleOpenEditModal(t)} className="text-gray-400 hover:text-violet-400 transition-colors" title="Editar">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDelete(t.id, t.description)} className="text-gray-400 hover:text-rose-500 transition-colors" title="Eliminar">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : ( <tr><td colSpan={7} className="text-center p-6 text-gray-400">{searchQuery ? 'No se encontraron resultados.' : 'No hay transacciones para mostrar en este período.'}</td></tr> )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-between items-center pt-4 border-t border-slate-700 mt-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            <ChevronLeftIcon className="w-4 h-4" />
                            Anterior
                        </button>
                        <span className="text-sm text-gray-400">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-1 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            Siguiente
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
            <AddTransactionModal isOpen={isModalOpen} onClose={handleCloseModal} transactionToEdit={selectedTransaction} />
        </>
    );
};

export default DatabaseView;