import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../../types';
import { PlusCircleIcon, SearchIcon } from '../icons';
import AddTransactionModal from '../modals/AddTransactionModal';

interface DatabaseViewProps {
    transactions: Transaction[];
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ transactions }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<'description' | 'category'>('description');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const searchedTransactions = useMemo(() => {
        if (!searchQuery.trim()) return transactions;
        const lowercasedQuery = searchQuery.toLowerCase();
        return transactions.filter(t => {
            if (searchType === 'description') return t.description.toLowerCase().includes(lowercasedQuery);
            if (searchType === 'category') return t.category.toLowerCase().includes(lowercasedQuery);
            return false;
        });
    }, [transactions, searchQuery, searchType]);

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
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            <PlusCircleIcon className="w-5 h-5"/>
                            <span>Añadir</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-slate-600 text-sm text-gray-400">
                            <tr>
                                <th className="p-3">Fecha</th><th className="p-3">Descripción</th><th className="p-3">Fuente</th><th className="p-3">Categoría</th><th className="p-3">Tipo</th><th className="p-3 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {searchedTransactions.length > 0 ? (
                                searchedTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="p-3 whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                                        <td className="p-3">{t.description}</td>
                                        <td className="p-3"><span className="bg-slate-600 text-gray-300 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">{t.source || 'N/A'}</span></td>
                                        <td className="p-3">{t.category}</td>
                                        <td className={`p-3 font-medium ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}</td>
                                        <td className={`p-3 text-right font-mono ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : ''}€{t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))
                            ) : ( <tr><td colSpan={6} className="text-center p-6 text-gray-400">{searchQuery ? 'No se encontraron resultados.' : 'No hay transacciones para mostrar en este período.'}</td></tr> )}
                        </tbody>
                    </table>
                </div>
            </div>
            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};

export default DatabaseView;