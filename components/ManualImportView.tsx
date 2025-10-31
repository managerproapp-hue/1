import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, StagedTransaction } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { UploadCloudIcon, FileIcon, SpinnerIcon } from './icons';

declare var XLSX: any;

type Stage = 'upload' | 'map' | 'review';
type Tab = 'dashboard' | 'importar' | 'base' | 'backup' | 'settings';

interface ManualImportViewProps {
  setActiveTab: (tab: Tab) => void;
}

const ManualImportView: React.FC<ManualImportViewProps> = ({ setActiveTab }) => {
    const { expenseCategories, handleConfirmImport, accounts } = useAppContext();

    const [stage, setStage] = useState<Stage>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<any[]>([]);
    const [staged, setStaged] = useState<StagedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');

    const [mapping, setMapping] = useState({
        date: '',
        description: '',
        amount: '',
    });

    const resetState = () => {
        setStage('upload');
        setFile(null);
        setHeaders([]);
        setRows([]);
        setStaged([]);
        setMapping({ date: '', description: '', amount: '' });
        setSelectedAccountId('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
        } else {
            alert('Por favor, selecciona un archivo CSV válido.');
            setFile(null);
        }
    };
    
    const processFile = () => {
        if (!file || !selectedAccountId) {
            alert("Por favor, selecciona un archivo y una cuenta.");
            return;
        }
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'string' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                const fileHeaders = jsonData[0] as string[];
                const fileRows = jsonData.slice(1).map((rowArray: any) => {
                    let rowObject: { [key: string]: any } = {};
                    fileHeaders.forEach((header, index) => {
                        rowObject[header] = rowArray[index];
                    });
                    return rowObject;
                });

                setHeaders(fileHeaders);
                setRows(fileRows);
                setMapping({
                    date: fileHeaders.find(h => /fecha/i.test(h)) || '',
                    description: fileHeaders.find(h => /descripci(o|ó)n|concepto/i.test(h)) || '',
                    amount: fileHeaders.find(h => /importe|monto|cantidad/i.test(h)) || '',
                });
                setStage('map');
            } catch (error) {
                console.error("Error processing CSV:", error);
                alert("Hubo un error al procesar el archivo CSV.");
                resetState();
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleMapping = () => {
        if (!mapping.date || !mapping.description || !mapping.amount) {
            alert("Por favor, mapea las columnas de Fecha, Descripción y Monto.");
            return;
        }
        
        const sourceName = accounts.find(acc => acc.id === selectedAccountId)?.accountName || 'Desconocida';
        const newStaged = rows.map((row, index) => {
            const amountStr = String(row[mapping.amount] || '0').replace(',', '.');
            const amount = parseFloat(amountStr);
            const dateValue = row[mapping.date];
            let date = new Date(); // default
            if (typeof dateValue === 'number' && dateValue > 1000) { // Excel date serial number
                 date = new Date(Date.UTC(1900, 0, dateValue - 1));
            } else if (typeof dateValue === 'string') {
                 date = new Date(dateValue.split('/').reverse().join('-')); // DD/MM/YYYY to YYYY-MM-DD
            }

            return {
                id: `manual-${index}`,
                date: date.toISOString().split('T')[0],
                description: row[mapping.description] || 'N/A',
                amount: Math.abs(amount),
                type: amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
                category: 'Sin Categorizar',
                isValid: true,
                source: sourceName,
            };
        }).filter(t => !isNaN(t.amount));

        setStaged(newStaged);
        setStage('review');
    };

    const handleCategoryChange = (id: string, newCategory: string) => {
        setStaged(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
    };

    const handleConfirm = () => {
        const finalTransactions: Transaction[] = staged.map(t => ({
            id: crypto.randomUUID(),
            date: new Date(t.date),
            description: t.description,
            amount: t.amount,
            type: t.type,
            category: t.category,
            source: t.source,
        }));
        handleConfirmImport(finalTransactions);
        resetState();
        setActiveTab('base');
    };


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800 rounded-xl">
                <SpinnerIcon className="w-16 h-16 text-violet-400 animate-spin mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Procesando Archivo...</h2>
            </div>
        );
    }

    if (stage === 'map') {
        return (
             <div className="bg-slate-800 p-6 rounded-xl shadow-lg max-w-2xl mx-auto space-y-4">
                <h2 className="text-2xl font-bold text-center">Mapear Columnas de CSV</h2>
                <p className="text-gray-400 text-center">Asocia las columnas de tu archivo con los campos de la aplicación.</p>
                {['date', 'description', 'amount'].map(field => (
                    <div key={field}>
                        <label className="block text-sm font-medium text-gray-300 mb-1 capitalize">
                            {field === 'amount' ? 'Monto' : field === 'date' ? 'Fecha' : 'Descripción'}
                        </label>
                        <select
                            value={mapping[field as keyof typeof mapping]}
                            onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500"
                        >
                            <option value="">Selecciona una columna</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                ))}
                <div className="flex justify-end space-x-4 pt-4">
                    <button onClick={resetState} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={handleMapping} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Revisar Transacciones</button>
                </div>
            </div>
        );
    }
    
    if (stage === 'review') {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4">Revisar Transacciones (Manual)</h2>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-600 text-sm text-gray-400 sticky top-0 bg-slate-800">
                                <tr><th className="p-3">Fecha</th><th className="p-3">Descripción</th><th className="p-3">Monto</th><th className="p-3">Tipo</th><th className="p-3">Categoría</th></tr>
                            </thead>
                            <tbody>
                                {staged.map(t => (
                                    <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="p-3">{t.date}</td>
                                        <td className="p-3">{t.description}</td>
                                        <td className={`p-3 font-mono ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === 'INCOME' ? '+' : '-'}€{t.amount.toLocaleString('es-ES')}</td>
                                        <td className={`p-3 font-medium ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === 'INCOME' ? 'Ingreso' : 'Gasto'}</td>
                                        <td className="p-3">
                                            <select value={t.category} onChange={(e) => handleCategoryChange(t.id, e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md py-1 px-2 text-white focus:ring-violet-500 focus:border-violet-500 w-full">
                                                {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex justify-end space-x-4">
                    <button onClick={resetState} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
                    <button onClick={handleConfirm} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Confirmar e Importar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Importación Manual de CSV</h2>
                <p className="text-gray-400 mt-1">Sube un archivo CSV con tus transacciones.</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label htmlFor="account-manual" className="block text-sm font-medium text-gray-300 mb-1">Cuenta (Obligatorio)</label>
                    <select id="account-manual" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                        <option value="" disabled>Selecciona una cuenta</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.bankName})</option>)}
                    </select>
                    {accounts.length === 0 && <p className="text-xs text-yellow-400 mt-1">No has añadido ninguna cuenta. Ve a Configuración para empezar.</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Archivo CSV</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400"/>
                            <div className="flex text-sm text-gray-400">
                                <label htmlFor="file-upload-manual" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-violet-400 hover:text-violet-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-violet-500">
                                    <span>Seleccionar Archivo</span>
                                    <input id="file-upload-manual" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv, text/csv"/>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">Solo archivos CSV</p>
                        </div>
                    </div>
                    {file && (
                        <div className="mt-3 flex items-center text-sm bg-slate-700 p-2 rounded-md">
                            <FileIcon className="w-5 h-5 text-gray-400 mr-2" />
                            <span className="truncate">{file.name}</span>
                        </div>
                    )}
                </div>
                <button
                    onClick={processFile}
                    disabled={!file || !selectedAccountId}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                >
                    Continuar
                </button>
            </div>
        </div>
    );
};

export default ManualImportView;
