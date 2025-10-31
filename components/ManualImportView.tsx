import React, { useState } from 'react';
import { StagedTransaction, Transaction, TransactionType, ProcessingError } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { FileDownIcon, UploadCloudIcon, SpinnerIcon } from '../icons';

const ManualImportView: React.FC<{ setActiveTab: (tab: 'dashboard') => void }> = ({ setActiveTab }) => {
    const { handleConfirmImport, expenseCategories } = useAppContext();
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
    const [processingErrors, setProcessingErrors] = useState<ProcessingError[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const parseCSV = (csvText: string): string[][] => {
        return csvText.trim().split('\n').map(row => row.split(',').map(cell => cell.trim()));
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setFileName(file.name);
        setStagedTransactions([]);
        setProcessingErrors([]);

        try {
            const text = await file.text();
            const rows = parseCSV(text);
            const headers = rows[0].map(h => h.toLowerCase());
            
            const dateIndex = headers.indexOf('date');
            const descriptionIndex = headers.indexOf('description');
            const amountIndex = headers.indexOf('amount');
            const typeIndex = headers.indexOf('type');
            
            if (dateIndex === -1 || descriptionIndex === -1 || amountIndex === -1 || typeIndex === -1) {
                alert('El CSV debe contener las columnas: date, description, amount, type.');
                setIsLoading(false);
                return;
            }

            const staged: StagedTransaction[] = [];
            const errors: ProcessingError[] = [];

            rows.slice(1).forEach((row, i) => {
                const rawData = row.join(', ');
                const date = row[dateIndex];
                const description = row[descriptionIndex];
                const amount = parseFloat(row[amountIndex]);
                const typeStr = row[typeIndex]?.toUpperCase();
                const type = typeStr === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
                
                const isValid = !isNaN(amount) && date && description && (type === TransactionType.INCOME || type === TransactionType.EXPENSE);

                if (isValid) {
                    staged.push({
                        id: `manual-${i}`,
                        date,
                        description,
                        amount,
                        type,
                        category: type === TransactionType.INCOME ? 'Ingresos' : expenseCategories[0],
                        isValid: true,
                        source: `CSV: ${file.name}`
                    });
                } else {
                    errors.push({ rawData, reason: 'Formato inválido o datos faltantes.' });
                }
            });

            setStagedTransactions(staged);
            setProcessingErrors(errors);

        } catch (error) {
            console.error("Error processing CSV:", error);
            alert("Hubo un error al procesar el archivo CSV.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        const validTransactions: Transaction[] = stagedTransactions
            .filter(t => t.isValid)
            .map(({ id, ...rest }) => ({
                id: crypto.randomUUID(),
                ...rest,
                date: new Date(rest.date),
            }));
        
        handleConfirmImport(validTransactions);
        setStagedTransactions([]);
        setProcessingErrors([]);
        setFileName(null);
        setActiveTab('dashboard');
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," 
            + "date,description,amount,type\n"
            + "2023-10-26,Compra supermercado,75.50,EXPENSE\n"
            + "2023-10-25,Salario,2100,INCOME\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_transacciones.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2">Importación Manual desde CSV</h2>
                <p className="text-gray-400 mb-4">Sube un archivo CSV con tus transacciones. Asegúrate de que tenga las columnas: <code className="bg-slate-700 p-1 rounded-md text-sm">date</code>, <code className="bg-slate-700 p-1 rounded-md text-sm">description</code>, <code className="bg-slate-700 p-1 rounded-md text-sm">amount</code>, y <code className="bg-slate-700 p-1 rounded-md text-sm">type</code> ('INCOME' o 'EXPENSE').</p>
                <div className="flex space-x-4">
                    <label className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer">
                        <UploadCloudIcon className="w-5 h-5"/>
                        <span>{fileName ? `Cargado: ${fileName}` : 'Seleccionar Archivo CSV'}</span>
                        <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                    </label>
                    <button onClick={downloadTemplate} className="flex items-center justify-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        <FileDownIcon className="w-5 h-5"/>
                        <span>Plantilla</span>
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className="text-center p-8">
                    <SpinnerIcon className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
                    <p className="mt-2">Procesando archivo...</p>
                </div>
            )}

            {stagedTransactions.length > 0 && !isLoading && (
                 <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Revisar Transacciones ({stagedTransactions.length})</h3>
                     <div className="max-h-96 overflow-y-auto mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-600 text-gray-400">
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Descripción</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-left">Tipo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-slate-700">
                                        <td className="p-2">{t.date}</td>
                                        <td className="p-2">{t.description}</td>
                                        <td className={`p-2 text-right ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>€{t.amount.toFixed(2)}</td>
                                        <td className="p-2">{t.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={handleConfirm} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-colors">Confirmar e Importar {stagedTransactions.length} Transacciones</button>
                 </div>
            )}
            {processingErrors.length > 0 && !isLoading && (
                 <div className="bg-rose-900/50 border border-rose-700 p-4 rounded-xl">
                    <h3 className="text-lg font-semibold text-rose-300 mb-2">Se encontraron {processingErrors.length} filas con errores que no se importarán:</h3>
                    <ul className="text-sm text-rose-200 list-disc list-inside">
                        {processingErrors.map((e, i) => <li key={i}><code className="text-xs">{e.rawData}</code> - {e.reason}</li>)}
                    </ul>
                 </div>
            )}
        </div>
    );
};

export default ManualImportView;
