import React, { useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { StagedTransaction, Transaction, TransactionType, Account } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, SpinnerIcon, UploadCloudIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

// Declarar las librerías globales de los CDNs
declare const pdfjsLib: any;
declare global {
  interface Window {
    XLSX: any;
  }
}

type Step = 'upload' | 'mapping' | 'review';
type CSVMapping = {
    date: number | null;
    description: number | null;
    amount: number | null;
};

const AiImportView: React.FC<{ setActiveTab: (tab: 'dashboard' | 'settings') => void }> = ({ setActiveTab }) => {
    const { handleConfirmImport, expenseCategories, incomeCategories, accounts } = useAppContext();
    
    // State Management
    const [step, setStep] = useState<Step>('upload');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // File & Account State
    const [file, setFile] = useState<File | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');

    // Mapping State
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [mapping, setMapping] = useState<CSVMapping>({ date: null, description: null, amount: null });

    // Review State
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
    
    const resetState = () => {
        setStep('upload');
        setIsLoading(false);
        setLoadingMessage('');
        setFile(null);
        setCsvHeaders([]);
        setCsvData([]);
        setMapping({ date: null, description: null, amount: null });
        setStagedTransactions([]);
    };

    const processStructuredFile = (selectedFile: File) => {
        if (typeof window.XLSX === 'undefined') {
            alert("La librería para leer archivos Excel no está cargada.");
            return;
        }
        setLoadingMessage('Procesando archivo...');
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows: (string|number)[][] = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const stringRows = rows.map(row => row.map(cell => String(cell ?? '')));

                setCsvHeaders(stringRows[0]);
                setCsvData(stringRows.slice(1));
                
                const newMapping: CSVMapping = { date: null, description: null, amount: null };
                stringRows[0].forEach((header, index) => {
                    const lowerHeader = header.toLowerCase();
                    if (!newMapping.date && (lowerHeader.includes('fecha') || lowerHeader.includes('date'))) newMapping.date = index;
                    if (!newMapping.description && (lowerHeader.includes('descrip') || lowerHeader.includes('concept'))) newMapping.description = index;
                    if (!newMapping.amount && (lowerHeader.includes('importe') || lowerHeader.includes('amount') || lowerHeader.includes('monto'))) newMapping.amount = index;
                });
                setMapping(newMapping);
                
                setStep('mapping');
            } catch (error) {
                alert('Error al leer el archivo Excel/CSV.');
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const processPdfFile = async (selectedFile: File) => {
        setLoadingMessage('Extrayendo texto del PDF...');
        setIsLoading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map((s: any) => s.str).join(' ');
                }
                await processTextWithAI(textContent);
            };
            reader.readAsArrayBuffer(selectedFile);
        } catch (error) {
            console.error("Error procesando PDF:", error);
            alert("Hubo un error al leer el archivo PDF.");
            setIsLoading(false);
        }
    };

    const processTextWithAI = async (text: string) => {
        setLoadingMessage('Analizando transacciones con IA...');
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const schema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING, description: 'Fecha en formato AAAA-MM-DD.' },
                        description: { type: Type.STRING, description: 'Descripción.' },
                        amount: { type: Type.NUMBER, description: 'Monto (negativo para gastos).' },
                    },
                    required: ['date', 'description', 'amount'],
                },
            };
            const prompt = `Analiza el siguiente extracto bancario. Extrae cada transacción. Ignora texto irrelevante como encabezados o saldos. Devuelve un array JSON. El 'amount' debe ser negativo para gastos y positivo para ingresos. Fechas en formato AAAA-MM-DD. Texto: --- ${text} ---`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema: schema },
            });
            const parsedTransactions = JSON.parse(response.text.trim());
            if (!Array.isArray(parsedTransactions)) throw new Error("La respuesta de la IA no es un array.");
            
            const staged = parsedTransactions.map(parseAIRow);
            setStagedTransactions(staged.filter(t => t.isValid));
            setStep('review');
        } catch (error) {
            console.error("Error con IA:", error);
            alert("Error al procesar los datos con la IA.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileSelect = (selectedFile: File | null) => {
        if (!selectedFile) return;
        if (!selectedAccountId) {
            alert("Por favor, selecciona una cuenta de destino primero.");
            return;
        }
        
        setFile(selectedFile);
        const fileType = selectedFile.name.toLowerCase();
        
        if (fileType.endsWith('.csv') || fileType.endsWith('.xls') || fileType.endsWith('.xlsx')) {
            processStructuredFile(selectedFile);
        } else if (fileType.endsWith('.pdf')) {
            processPdfFile(selectedFile);
        } else {
            alert("Formato de archivo no soportado. Sube un archivo PDF, Excel o CSV.");
        }
    };

    const handleMappingConfirm = () => {
        if (mapping.date === null || mapping.description === null || mapping.amount === null) {
            alert('Por favor, mapea las columnas de Fecha, Descripción y Monto.');
            return;
        }
        const staged = csvData.map(parseMappedRow);
        setStagedTransactions(staged.filter(t => t.isValid));
        setStep('review');
    };
    
    const parseMappedRow = (row: string[], i: number): StagedTransaction => {
        const rawDate = row[mapping.date!];
        let date = '';
        try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                 date = d.toISOString().split('T')[0];
            } else {
                const dateParts = rawDate.match(/(\d+)/g);
                if (dateParts && dateParts.length >= 3) {
                    let [p1, p2, p3] = dateParts.map(p => parseInt(p));
                    let day, month, year;
                    if (p1 > 1000) { [year, month, day] = [p1, p2, p3]; }
                    else { [day, month, year] = [p1, p2, p3 < 100 ? 2000 + p3 : p3]; }
                    if (year && month && day) date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                }
            }
        } catch (e) { /* ignore invalid dates */ }

        const description = row[mapping.description!];
        const amountStr = row[mapping.amount!].replace(/[^0-9.,-]/g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
        const isValid = !!(!isNaN(amount) && date && description);

        return {
            id: `manual-${i}`, date, description, amount: Math.abs(amount), type,
            category: type === TransactionType.INCOME ? (incomeCategories[0] || 'Ingresos Varios') : 'Sin Categorizar',
            isValid, accountId: selectedAccountId,
        };
    };
    
    const parseAIRow = (t: any, i: number): StagedTransaction => {
        const amount = parseFloat(t.amount);
        const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
        const dateParts = String(t.date).match(/\d+/g);
        let isValidDate = false;
        if (dateParts && dateParts.length >= 3) {
            const year = parseInt(dateParts[0]);
            if (year > 1900) isValidDate = true;
        }
        const isValid = !!(t.date && isValidDate && t.description && !isNaN(amount));

        return {
            id: `ai-${Date.now()}-${i}`, date: t.date || '',
            description: t.description || 'Sin descripción', amount: Math.abs(amount), type,
            category: type === TransactionType.INCOME ? (incomeCategories[0] || 'Ingresos Varios') : 'Sin Categorizar',
            isValid,
            accountId: selectedAccountId,
        };
    };

    const handleAiCategorize = async () => {
        const transactionsToCategorize = stagedTransactions.filter(t => t.type === TransactionType.EXPENSE && t.category === 'Sin Categorizar');
        if (transactionsToCategorize.length === 0) {
            alert("No hay transacciones sin categorizar para procesar.");
            return;
        }

        setLoadingMessage('Categorizando con IA...');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const descriptions = transactionsToCategorize.map(t => ({ id: t.id, description: t.description }));
            const prompt = `Dadas las siguientes categorías de gastos: [${expenseCategories.join(', ')}]. Asigna la categoría más apropiada a cada una de las siguientes descripciones de transacciones. Devuelve SÓLO un array de objetos JSON con los campos "id" y "category". Asegúrate que la categoría que asignes sea una de las de la lista. \n${JSON.stringify(descriptions)}`;
            const schema = {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        category: { type: Type.STRING },
                    },
                    required: ['id', 'category'],
                },
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema: schema },
            });

            const categorized: { id: string; category: string }[] = JSON.parse(response.text.trim());
            const categoryMap = new Map(categorized.map(item => [item.id, item.category]));

            setStagedTransactions(prev => prev.map(t => {
                const newCategory = categoryMap.get(t.id);
                // Only update if the AI returned a valid category from the list
                if (newCategory && expenseCategories.includes(newCategory)) {
                    return { ...t, category: newCategory };
                }
                return t;
            }));
        } catch (error) {
            console.error("Error en la categorización con IA:", error);
            alert("Hubo un error al intentar categorizar las transacciones.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const updateStagedTransaction = (id: string, field: keyof StagedTransaction, value: any) => {
        setStagedTransactions(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
    };

    const handleConfirm = () => {
        const transactionsToImport: Omit<Transaction, 'id'>[] = stagedTransactions.map(({ id, isValid, ...rest }) => ({
             ...rest, date: new Date(`${rest.date}T00:00:00`),
        }));
        
        const finalTransactions = transactionsToImport.map(t => ({...t, id: crypto.randomUUID()}));

        handleConfirmImport(finalTransactions);
        resetState();
        setActiveTab('dashboard');
    };

    if (accounts.length === 0) {
        return (
             <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center max-w-lg mx-auto">
                <h3 className="text-xl font-semibold mb-2">Primer Paso: Añadir una Cuenta</h3>
                <p className="text-gray-400 mb-4">Para poder importar transacciones, primero necesitas crear al menos una cuenta bancaria.</p>
                <button onClick={() => setActiveTab('settings')} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                    Ir a Configuración
                </button>
            </div>
        )
    }

    const renderContent = () => {
        switch(step) {
            case 'upload':
                return (
                    <div>
                        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2 justify-center"><SparklesIcon className="w-6 h-6 text-violet-400" />Importación Rápida de Extractos</h2>
                        <p className="text-gray-400 mb-4 text-center">Sube tu extracto y nosotros haremos el trabajo pesado.</p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="account-select" className="block text-sm font-medium text-gray-300 mb-1">1. Selecciona la cuenta de destino</label>
                                <select id="account-select" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.bankName})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">2. Sube el extracto bancario</label>
                                <label className="mt-1 flex justify-center w-full h-32 px-4 transition bg-slate-900/50 border-2 border-slate-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-violet-400 focus:outline-none">
                                    <span className="flex items-center space-x-2">
                                        <UploadCloudIcon className="w-8 h-8 text-gray-400" />
                                        <span className="font-medium text-gray-400">{file ? `Archivo: ${file.name}` : 'Arrastra un archivo o haz clic para seleccionar'}</span>
                                    </span>
                                    <input type="file" className="hidden" accept=".pdf,.csv,.xls,.xlsx" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} />
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'mapping':
                return (
                    <div>
                        <h2 className="text-2xl font-semibold mb-2">Paso 2: Mapea las Columnas</h2>
                        <p className="text-gray-400 mb-4">Indica qué columna de tu archivo corresponde a cada campo.</p>
                        <div className="space-y-4">
                            {(['date', 'description', 'amount'] as const).map(field => (
                                <div key={field}>
                                    <label className="block text-sm font-medium text-gray-300 capitalize">
                                        {field === 'date' ? 'Fecha' : field === 'description' ? 'Descripción' : 'Monto'} <span className="text-red-500">*</span>
                                    </label>
                                    <select value={mapping[field] ?? ''} onChange={e => setMapping(prev => ({ ...prev, [field]: parseInt(e.target.value) }))} className="mt-1 block w-full py-2 px-3 border border-slate-600 bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm">
                                        <option value="">Selecciona una columna...</option>
                                        {csvHeaders.map((header, index) => <option key={index} value={index}>{header}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button onClick={() => setStep('upload')} className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg"><ChevronLeftIcon className="w-5 h-5"/><span>Atrás</span></button>
                            <button onClick={handleMappingConfirm} className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-lg"><span>Continuar</span><ChevronRightIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                );
            case 'review':
                return (
                    <div>
                        <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                            <h3 className="text-xl font-semibold">Paso Final: Revisa y Categoriza ({stagedTransactions.length})</h3>
                            <button onClick={handleAiCategorize} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"><SparklesIcon className="w-4 h-4"/><span>Categorizar Gastos con IA</span></button>
                        </div>
                         <div className="max-h-96 overflow-y-auto mb-4 border border-slate-700 rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-800"><tr className="border-b border-slate-600 text-gray-400"><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Descripción</th><th className="p-2 text-right">Monto</th><th className="p-2 text-left">Categoría</th></tr></thead>
                                <tbody>
                                    {stagedTransactions.map(t => (
                                        <tr key={t.id} className="border-b border-slate-700">
                                            <td className="p-2 whitespace-nowrap">{t.date}</td><td className="p-2">{t.description}</td>
                                            <td className={`p-2 text-right font-semibold whitespace-nowrap ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                                            <td className="p-2">
                                                {t.type === TransactionType.EXPENSE ? (
                                                    <select value={t.category} onChange={(e) => updateStagedTransaction(t.id, 'category', e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md py-1 px-2 text-white text-xs">
                                                        {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                ) : (
                                                    <select value={t.category} onChange={(e) => updateStagedTransaction(t.id, 'category', e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md py-1 px-2 text-white text-xs">
                                                        {incomeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-between">
                            <button onClick={() => file?.name.toLowerCase().endsWith('.pdf') ? resetState() : setStep('mapping')} className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg"><ChevronLeftIcon className="w-5 h-5"/><span>Atrás</span></button>
                            <button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">Confirmar e Importar {stagedTransactions.length} Transacciones</button>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg relative">
                {isLoading && (
                    <div className="absolute inset-0 bg-slate-800/80 flex flex-col items-center justify-center z-10">
                        <SpinnerIcon className="w-10 h-10 text-violet-400 animate-spin" />
                        <p className="mt-2 text-lg">{loadingMessage}</p>
                    </div>
                )}
                {renderContent()}
            </div>
        </div>
    );
};

export default AiImportView;