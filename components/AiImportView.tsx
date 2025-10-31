
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { StagedTransaction, Transaction, TransactionType, ProcessingError, Account } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, SpinnerIcon, UploadCloudIcon } from './icons';

// Declarar pdfjsLib para que TypeScript lo reconozca
declare const pdfjsLib: any;

const AiImportView: React.FC<{ setActiveTab: (tab: 'dashboard') => void }> = ({ setActiveTab }) => {
    const { handleConfirmImport, expenseCategories, accounts } = useAppContext();
    const [statementText, setStatementText] = useState('');
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
    const [processingErrors, setProcessingErrors] = useState<ProcessingError[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isParsingFile, setIsParsingFile] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string | ''>('');
    const [isDragOver, setIsDragOver] = useState(false);

    const getSelectedAccount = (): Account | undefined => {
        return accounts.find(acc => acc.id === selectedAccountId);
    };

    const handleFileDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            await processFile(file);
        }
    }, []);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await processFile(file);
        }
    };
    
    const processFile = async (file: File) => {
        setIsParsingFile(true);
        setStatementText('');
        try {
            if (file.type === 'application/pdf') {
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
                };
                reader.readAsArrayBuffer(file);
            } else if (file.type === 'text/plain') {
                const text = await file.text();
                setStatementText(text);
            } else {
                alert("Por favor, sube un archivo PDF o TXT.");
            }
        } catch (error) {
            console.error("Error processing file:", error);
            alert("Hubo un error al leer el archivo.");
        } finally {
            setIsParsingFile(false);
        }
    }

    const processWithAI = async () => {
        if (!statementText.trim()) {
            alert("Por favor, sube un archivo o pega el texto de tu extracto bancario.");
            return;
        }
        if (!process.env.API_KEY) {
            alert("La clave de API no está configurada.");
            return;
        }

        setIsLoading(true);
        setStagedTransactions([]);
        setProcessingErrors([]);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING, description: 'Fecha en formato AAAA-MM-DD.' },
                    description: { type: Type.STRING },
                    amount: { type: Type.NUMBER, description: 'Monto positivo para ingresos, negativo para gastos.' },
                },
                required: ['date', 'description', 'amount'],
            },
        };
        const prompt = `Analiza el siguiente extracto bancario. Extrae todas las transacciones. Devuelve un array JSON basado en el esquema. Ignora texto no transaccional (saldos, encabezados). Asegúrate que la fecha es AAAA-MM-DD. Extracto: --- ${statementText} ---`;

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
                const isValid = t.date && t.description && !isNaN(amount);
                return {
                    id: `ai-${Date.now()}-${i}`, date: t.date || '',
                    description: t.description || 'Sin descripción', amount: Math.abs(amount), type,
                    category: type === TransactionType.INCOME ? 'Ingresos' : 'Sin Categorizar', isValid,
                    source: getSelectedAccount()?.accountName || 'IA Import',
                };
            });
            setStagedTransactions(staged);
        } catch (error) {
            console.error("Error with AI processing:", error);
            alert("Hubo un error al procesar los datos con la IA. Verifica el formato del texto o inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const updateStagedTransaction = (id: string, field: keyof StagedTransaction, value: any) => {
        setStagedTransactions(prev => prev.map(t => (t.id === id ? { ...t, [field]: value } : t)));
    };

    const handleConfirm = () => {
        const transactionsToImport: Transaction[] = stagedTransactions
            .filter(t => t.isValid)
            .map(({ id, ...rest }) => ({
                id: crypto.randomUUID(), ...rest, date: new Date(`${rest.date}T00:00:00`),
            }));
        handleConfirmImport(transactionsToImport);
        setStagedTransactions([]); setStatementText(''); setActiveTab('dashboard');
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-violet-400" />Importación Inteligente con IA</h2>
                <p className="text-gray-400 mb-4">Sube un archivo (PDF, TXT) o pega el texto de tu extracto. La IA lo analizará por ti.</p>
                
                {accounts.length > 0 && (
                    <div className="mb-4">
                        <label htmlFor="account-select" className="block text-sm font-medium text-gray-300 mb-1">Seleccionar Cuenta (Recomendado)</label>
                        <select id="account-select" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                             <option value="">Ninguna / Genérica</option>
                             {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.bankName})</option>)}
                        </select>
                    </div>
                )}

                <div 
                    onDrop={handleFileDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    className={`relative border-2 border-dashed border-slate-600 rounded-lg p-4 transition-colors ${isDragOver ? 'bg-slate-700/50' : ''}`}
                >
                    <input type="file" id="file-upload" accept=".pdf,.txt" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="text-center">
                        <UploadCloudIcon className="w-10 h-10 mx-auto text-gray-400 mb-2"/>
                        <label htmlFor="file-upload" className="font-semibold text-violet-400 cursor-pointer">
                            Selecciona un archivo
                            <span className="text-gray-400 font-normal"> o arrástralo aquí</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Soportado: PDF, TXT</p>
                    </div>
                </div>

                <div className="my-4 text-center text-gray-400">O</div>

                <textarea
                    value={statementText}
                    onChange={(e) => setStatementText(e.target.value)}
                    placeholder="Pega aquí el texto de tu extracto bancario..."
                    className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-gray-300 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                    disabled={isLoading || isParsingFile}
                />
                <button
                    onClick={processWithAI}
                    disabled={isLoading || isParsingFile || !statementText}
                    className="w-full mt-4 flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isLoading || isParsingFile ? <SpinnerIcon className="w-6 h-6 animate-spin" /> : <SparklesIcon className="w-6 h-6" />}
                    <span>{isParsingFile ? 'Leyendo Archivo...' : isLoading ? 'Analizando...' : 'Analizar con IA'}</span>
                </button>
            </div>
            
            {stagedTransactions.length > 0 && !isLoading && (
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Revisa y Categoriza ({stagedTransactions.length})</h3>
                    <div className="max-h-96 overflow-y-auto mb-4 border border-slate-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-800"><tr className="border-b border-slate-600 text-gray-400"><th className="p-2 text-left">Fecha</th><th className="p-2 text-left">Descripción</th><th className="p-2 text-right">Monto</th><th className="p-2 text-left">Categoría</th></tr></thead>
                            <tbody>
                                {stagedTransactions.map(t => (
                                    <tr key={t.id} className={`border-b border-slate-700 ${!t.isValid ? 'bg-rose-900/50' : ''}`}>
                                        <td className="p-2">{t.date}</td><td className="p-2">{t.description}</td>
                                        <td className={`p-2 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
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
                    <button onClick={handleConfirm} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-colors">Confirmar e Importar {stagedTransactions.length} Transacciones</button>
                </div>
            )}
        </div>
    );
};

export default AiImportView;
