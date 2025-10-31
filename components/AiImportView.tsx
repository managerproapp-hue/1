
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { StagedTransaction, Transaction, TransactionType, Account } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, SpinnerIcon, UploadCloudIcon } from './icons';

// Declarar las librerías globales de los CDNs para que TypeScript las reconozca
declare const pdfjsLib: any;
declare global {
  interface Window {
    XLSX: any;
  }
}


const AiImportView: React.FC<{ setActiveTab: (tab: 'dashboard' | 'settings') => void }> = ({ setActiveTab }) => {
    const { handleConfirmImport, expenseCategories, accounts } = useAppContext();
    const [statementText, setStatementText] = useState('');
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isParsingFile, setIsParsingFile] = useState(false);
    const [fileName, setFileName] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
    const [isDragOver, setIsDragOver] = useState(false);

    const getSelectedAccount = (): Account | undefined => {
        return accounts.find(acc => acc.id === selectedAccountId);
    };

    const processFile = async (file: File) => {
        setIsParsingFile(true);
        setFileName(file.name);
        setStatementText('');
        setStagedTransactions([]);

        try {
            const fileType = file.type;
            if (fileType === 'application/pdf') {
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
                    setStatementText(textContent);
                    setIsParsingFile(false);
                };
                reader.readAsArrayBuffer(file);
            } else if (fileType === 'text/csv' || file.name.endsWith('.csv')) {
                const text = await file.text();
                setStatementText(text);
                setIsParsingFile(false);
            } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (typeof window.XLSX === 'undefined') {
                        alert("La librería para leer archivos Excel no está cargada.");
                        setIsParsingFile(false);
                        return;
                    }
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const csvText = window.XLSX.utils.sheet_to_csv(worksheet);
                    setStatementText(csvText);
                    setIsParsingFile(false);
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert("Formato de archivo no soportado. Por favor, sube un archivo PDF, Excel (XLSX) o CSV.");
                setIsParsingFile(false);
            }
        } catch (error) {
            console.error("Error procesando el archivo:", error);
            alert("Hubo un error al leer el archivo.");
            setIsParsingFile(false);
        }
    };

    const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) processFile(file);
    };

    const processWithAI = async () => {
        if (!statementText.trim()) {
            alert("No hay texto para analizar. Por favor, sube un extracto bancario.");
            return;
        }
        if (!selectedAccountId) {
            alert("Por favor, selecciona una cuenta a la que asociar las transacciones.");
            return;
        }

        setIsLoading(true);
        setStagedTransactions([]);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: 'Fecha de la transacción en formato AAAA-MM-DD.' },
                    description: { type: Type.STRING, description: 'Descripción o concepto de la transacción.' },
                    amount: { type: Type.NUMBER, description: 'Monto de la transacción. Debe ser un número negativo para gastos y positivo para ingresos.' },
                },
                required: ['date', 'description', 'amount'],
            },
        };
        const prompt = `Analiza el siguiente texto de un extracto bancario. El texto puede ser de un PDF, CSV o Excel. Extrae cada transacción individual. Ignora completamente encabezados, resúmenes de saldo, pies de página o cualquier texto irrelevante. Devuelve solo un array JSON válido que se ajuste al esquema proporcionado. El campo 'amount' debe ser negativo para gastos y positivo para ingresos. Asegúrate de que las fechas estén en formato AAAA-MM-DD. Texto del extracto: --- ${statementText} ---`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema: schema },
            });
            const parsedTransactions = JSON.parse(response.text.trim());
            if (!Array.isArray(parsedTransactions)) throw new Error("La respuesta de la IA no es un array.");
            
            const staged: StagedTransaction[] = parsedTransactions.map((t: any, i: number) => {
                const amount = parseFloat(t.amount);
                const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
                const dateParts = String(t.date).match(/\d+/g);
                let isValidDate = false;
                if (dateParts && dateParts.length >= 3) {
                    const year = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]);
                    if (year > 1900 && month > 0 && month < 13) isValidDate = true;
                }

                const isValid = t.date && isValidDate && t.description && !isNaN(amount);
                return {
                    id: `ai-${Date.now()}-${i}`, date: t.date || '',
                    description: t.description || 'Sin descripción', amount: Math.abs(amount), type,
                    category: type === TransactionType.INCOME ? 'Ingresos' : 'Sin Categorizar', isValid,
                    source: getSelectedAccount()?.accountName || 'Importación',
                };
            });
            setStagedTransactions(staged.filter(t => t.isValid));
        } catch (error) {
            console.error("Error con el procesamiento de IA:", error);
            alert("Hubo un error al procesar los datos con la IA. El formato del extracto puede no ser compatible o el servicio falló. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const updateStagedTransaction = (id: string, field: keyof StagedTransaction, value: any) => {
        setStagedTransactions(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
    };

    const handleConfirm = () => {
        const transactionsToImport: Transaction[] = stagedTransactions.map(({ id, ...rest }) => ({
            id: crypto.randomUUID(), ...rest, date: new Date(`${rest.date}T00:00:00`),
        }));
        handleConfirmImport(transactionsToImport);
        setStagedTransactions([]); setStatementText(''); setFileName(''); setActiveTab('dashboard');
    };

    if (accounts.length === 0) {
        return (
             <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-center max-w-lg mx-auto">
                <h3 className="text-xl font-semibold mb-2">Primer Paso: Añadir una Cuenta</h3>
                <p className="text-gray-400 mb-4">Para poder importar transacciones, primero necesitas crear al menos una cuenta bancaria a la que asociarlas.</p>
                <button onClick={() => setActiveTab('settings')} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                    Ir a Configuración
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-violet-400" />Importación Automática de Extractos</h2>
                <p className="text-gray-400 mb-4">Añade transacciones de forma masiva subiendo el extracto de tu banco.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="account-select" className="block text-sm font-medium text-gray-300 mb-1">1. Selecciona la cuenta de destino</label>
                        <select id="account-select" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                             {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.bankName})</option>)}
                        </select>
                    </div>
                     <div>
                        <button onClick={processWithAI} disabled={isLoading || isParsingFile || !statementText} className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-3 rounded-lg transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed">
                            {isParsingFile || isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                            <span>{isParsingFile ? 'Leyendo...' : isLoading ? 'Analizando...' : '3. Analizar'}</span>
                        </button>
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">2. Sube el extracto bancario</label>
                    <div onDrop={handleFileDrop} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }} onDragLeave={() => setIsDragOver(false)} className={`relative border-2 border-dashed border-slate-600 rounded-lg p-6 text-center transition-colors ${isDragOver ? 'bg-slate-700/50' : ''}`}>
                        <input type="file" id="file-upload" accept=".pdf,.csv,.xlsx" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <UploadCloudIcon className="w-10 h-10 mx-auto text-gray-400 mb-2"/>
                        <p className="font-semibold text-violet-400">
                            {fileName || 'Selecciona un archivo o arrástralo aquí'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Soportado: PDF, Excel (XLSX), CSV</p>
                    </div>
                </div>
            </div>
            
            {stagedTransactions.length > 0 && !isLoading && (
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">4. Revisa y categoriza las transacciones encontradas ({stagedTransactions.length})</h3>
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
                                            ) : <span className="text-gray-400">Ingreso</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={handleConfirm} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors">Confirmar e Importar {stagedTransactions.length} Transacciones</button>
                </div>
            )}
        </div>
    );
};

export default AiImportView;
