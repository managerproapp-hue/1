
import React, { useState } from 'react';
import { StagedTransaction, Transaction, TransactionType } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { UploadCloudIcon, SpinnerIcon, ChevronRightIcon, ChevronLeftIcon } from './icons';

type CSVMapping = {
    date: number | null;
    description: number | null;
    amount: number | null;
    type?: number | null; // Optional: for single-column amount
    incomeAmount?: number | null; // Optional: for separate income/expense columns
    expenseAmount?: number | null; // Optional: for separate income/expense columns
};

const ManualImportView: React.FC<{ setActiveTab: (tab: 'dashboard') => void }> = ({ setActiveTab }) => {
    const { handleConfirmImport, expenseCategories } = useAppContext();
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<CSVMapping>({ date: null, description: null, amount: null });
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = async (selectedFile: File) => {
        if (!selectedFile) return;
        setIsLoading(true);
        setFile(selectedFile);

        try {
            const text = await selectedFile.text();
            const rows: string[][] = text.trim().split('\n').map(row => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.trim().replace(/^"|"$/g, '')));
            
            setCsvHeaders(rows[0]);
            setCsvData(rows.slice(1));
            // Auto-map common headers
            const newMapping: CSVMapping = { date: null, description: null, amount: null };
            rows[0].forEach((header, index) => {
                const lowerHeader = header.toLowerCase();
                if (lowerHeader.includes('fecha') || lowerHeader.includes('date')) newMapping.date = index;
                if (lowerHeader.includes('descrip') || lowerHeader.includes('concept')) newMapping.description = index;
                if (lowerHeader.includes('importe') || lowerHeader.includes('amount') || lowerHeader.includes('monto')) newMapping.amount = index;
            });
            setMapping(newMapping);
            
            setStep(2);
        } catch (error) {
            alert('Error al leer el archivo CSV.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const processMapping = () => {
        if (mapping.date === null || mapping.description === null || mapping.amount === null) {
            alert('Por favor, mapea las columnas de Fecha, Descripción y Monto.');
            return;
        }

        const staged: StagedTransaction[] = csvData.map((row, i) => {
            const rawDate = row[mapping.date!];
            // Attempt to parse various common date formats
            const dateParts = rawDate.match(/(\d+)/g);
            let date = '';
            if(dateParts && dateParts.length >= 3) {
                 const [d, m, y] = dateParts.map(p => parseInt(p));
                 // Handle dd/mm/yyyy and yyyy-mm-dd
                 const year = y > 1000 ? y : 2000 + y;
                 const month = m;
                 const day = d;
                 if (year && month && day) {
                    date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                 }
            } else {
                date = new Date(rawDate).toISOString().split('T')[0]; // Fallback
            }

            const description = row[mapping.description!];
            const amountStr = row[mapping.amount!].replace(/[^0-9.,-]/g, '').replace(',', '.');
            const amount = parseFloat(amountStr);
            const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
            
            const isValid = !isNaN(amount) && date !== 'NaN-NaN-NaN' && description;

            return {
                id: `manual-${i}`, date, description, amount: Math.abs(amount), type,
                category: type === TransactionType.INCOME ? 'Ingresos' : expenseCategories[0], isValid, source: `CSV: ${file?.name}`
            };
        });
        
        setStagedTransactions(staged.filter(t => t.isValid));
        setStep(3);
    };

    const handleConfirm = () => {
        const validTransactions: Transaction[] = stagedTransactions.map(({ id, ...rest }) => ({
            id: crypto.randomUUID(), ...rest, date: new Date(`${rest.date}T00:00:00`)
        }));
        handleConfirmImport(validTransactions);
        setStep(1); setFile(null);
        setActiveTab('dashboard');
    };

    return (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            {/* Steps Indicator */}
            <div className="flex items-center justify-center mb-6">
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-violet-600 text-white' : 'bg-slate-700 text-gray-400'}`}>
                            {s}
                        </div>
                        {s < 3 && <div className={`flex-auto h-0.5 ${step > s ? 'bg-violet-600' : 'bg-slate-700'}`}></div>}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: File Upload */}
            {step === 1 && (
                <div>
                    <h2 className="text-2xl font-semibold mb-2 text-center">Paso 1: Sube tu archivo CSV</h2>
                    <p className="text-gray-400 mb-4 text-center">Arrastra o selecciona el extracto de tu banco en formato CSV.</p>
                    <label className="mt-4 flex justify-center w-full h-32 px-4 transition bg-slate-900/50 border-2 border-slate-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-violet-400 focus:outline-none">
                        <span className="flex items-center space-x-2">
                            <UploadCloudIcon className="w-8 h-8 text-gray-400" />
                            <span className="font-medium text-gray-400">{file ? `Archivo: ${file.name}` : 'Arrastra un archivo o haz clic para seleccionar'}</span>
                        </span>
                        <input type="file" name="file_upload" className="hidden" accept=".csv" onChange={(e) => handleFileChange(e.target.files![0])} />
                    </label>
                    {isLoading && <SpinnerIcon className="w-8 h-8 text-violet-400 animate-spin mx-auto mt-4" />}
                </div>
            )}

            {/* Step 2: Column Mapping */}
            {step === 2 && (
                <div>
                    <h2 className="text-2xl font-semibold mb-2">Paso 2: Mapea las Columnas</h2>
                    <p className="text-gray-400 mb-4">Indica qué columna de tu archivo corresponde a cada campo.</p>
                    <div className="space-y-4">
                        {['date', 'description', 'amount'].map(field => (
                            <div key={field}>
                                <label className="block text-sm font-medium text-gray-300 capitalize">
                                    {field === 'date' ? 'Fecha' : field === 'description' ? 'Descripción' : 'Monto'} <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    value={mapping[field as keyof CSVMapping] ?? ''} 
                                    onChange={e => setMapping(prev => ({ ...prev, [field]: parseInt(e.target.value) }))}
                                    className="mt-1 block w-full py-2 px-3 border border-slate-600 bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                                >
                                    <option value="">Selecciona una columna...</option>
                                    {csvHeaders.map((header, index) => <option key={index} value={index}>{header}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-between">
                        <button onClick={() => setStep(1)} className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg"><ChevronLeftIcon className="w-5 h-5"/><span>Atrás</span></button>
                        <button onClick={processMapping} className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg"><span>Continuar</span><ChevronRightIcon className="w-5 h-5"/></button>
                    </div>
                </div>
            )}
            
            {/* Step 3: Review and Confirm */}
            {step === 3 && (
                <div>
                    <h2 className="text-2xl font-semibold mb-2">Paso 3: Revisa y Confirma</h2>
                    <p className="text-gray-400 mb-4">{stagedTransactions.length} transacciones listas para importar.</p>
                     <div className="max-h-96 overflow-y-auto mb-4 border border-slate-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-800"><tr className="border-b border-slate-600 text-gray-400"><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Descripción</th><th className="p-2 text-right">Monto</th><th className="p-2 text-left">Tipo</th></tr></thead>
                            <tbody>
                                {stagedTransactions.map(t => (
                                    <tr key={t.id} className="border-b border-slate-700">
                                        <td className="p-2">{t.date}</td><td className="p-2">{t.description}</td>
                                        <td className={`p-2 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                        <td className="p-2">{t.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="mt-6 flex justify-between">
                        <button onClick={() => setStep(2)} className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg"><ChevronLeftIcon className="w-5 h-5"/><span>Atrás</span></button>
                        <button onClick={handleConfirm} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg">Confirmar e Importar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManualImportView;
