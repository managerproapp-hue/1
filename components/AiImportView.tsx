import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { StagedTransaction, Transaction, TransactionType, ProcessingError, Account } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { SparklesIcon, SpinnerIcon } from '../icons';

const AiImportView: React.FC<{ setActiveTab: (tab: 'dashboard') => void }> = ({ setActiveTab }) => {
    const { handleConfirmImport, expenseCategories, accounts } = useAppContext();
    const [statementText, setStatementText] = useState('');
    const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
    const [processingErrors, setProcessingErrors] = useState<ProcessingError[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string | ''>('');

    const getSelectedAccount = (): Account | undefined => {
        return accounts.find(acc => acc.id === selectedAccountId);
    };

    const processWithAI = async () => {
        if (!statementText.trim()) {
            alert("Por favor, pega el texto de tu extracto bancario.");
            return;
        }
        if (!process.env.API_KEY) {
            alert("La clave de API no está configurada.");
            return;
        }

        setIsLoading(true);
        setStagedTransactions([]);
        setProcessingErrors([]);

        // Fix: Use correct constructor for GoogleGenAI
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: {
                        type: Type.STRING,
                        description: 'Fecha de la transacción en formato AAAA-MM-DD.',
                    },
                    description: {
                        type: Type.STRING,
                        description: 'Descripción de la transacción.',
                    },
                    amount: {
                        type: Type.NUMBER,
                        description: 'Monto de la transacción. Usa un número positivo para ingresos y negativo para gastos.',
                    },
                },
                required: ['date', 'description', 'amount'],
            },
        };
        
        const prompt = `
            Analiza el siguiente extracto bancario y extrae todas las transacciones. 
            Devuelve el resultado como un array JSON basado en el esquema proporcionado.
            Ignora cualquier texto que no parezca una transacción (saldos, encabezados, etc.).
            Asegúrate de que la fecha esté en formato AAAA-MM-DD.

            Extracto:
            ---
            ${statementText}
            ---
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                },
            });

            // Fix: Access text directly from response
            const jsonStr = response.text.trim();
            const parsedTransactions = JSON.parse(jsonStr);

            if (!Array.isArray(parsedTransactions)) {
                throw new Error("La respuesta de la IA no es un array.");
            }
            
            const staged: StagedTransaction[] = parsedTransactions.map((t: any, i: number) => {
                const amount = parseFloat(t.amount);
                const type = amount >= 0 ? TransactionType.INCOME : TransactionType.EXPENSE;
                const isValid = t.date && t.description && !isNaN(amount);

                return {
                    id: `ai-${Date.now()}-${i}`,
                    date: t.date || '',
                    description: t.description || 'Sin descripción',
                    amount: Math.abs(amount),
                    type,
                    category: type === TransactionType.INCOME ? 'Ingresos' : 'Sin Categorizar',
                    isValid,
                    source: getSelectedAccount()?.accountName || 'IA Import',
                };
            });
            setStagedTransactions(staged);

        } catch (error) {
            console.error("Error with AI processing:", error);
            alert("Hubo un error al procesar los datos con la IA. Verifica el formato del texto o inténtalo de nuevo.");
            setProcessingErrors([{ rawData: statementText.substring(0, 100) + '...', reason: 'Error de la IA.' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const updateStagedTransaction = (id: string, field: keyof StagedTransaction, value: any) => {
        setStagedTransactions(prev =>
            prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
        );
    };

    const handleConfirm = () => {
        const transactionsToImport: Transaction[] = stagedTransactions
            .filter(t => t.isValid)
            .map(({ id, ...rest }) => ({
                id: crypto.randomUUID(),
                ...rest,
                date: new Date(`${rest.date}T00:00:00`),
            }));
        
        handleConfirmImport(transactionsToImport);
        setStagedTransactions([]);
        setStatementText('');
        setActiveTab('dashboard');
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-violet-400" />
                    Importación Inteligente con IA
                </h2>
                <p className="text-gray-400 mb-4">Pega el contenido de tu extracto bancario (de un PDF o de la web) en el área de texto. La IA lo analizará y extraerá las transacciones por ti.</p>
                
                {accounts.length > 0 && (
                    <div className="mb-4">
                        <label htmlFor="account-select" className="block text-sm font-medium text-gray-300 mb-1">Seleccionar Cuenta (Recomendado)</label>
                        <select id="account-select" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                             <option value="">Ninguna / Genérica</option>
                             {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.bankName})</option>)}
                        </select>
                    </div>
                )}

                <textarea
                    value={statementText}
                    onChange={(e) => setStatementText(e.target.value)}
                    placeholder="Pega aquí el texto de tu extracto bancario..."
                    className="w-full h-48 bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-gray-300 focus:ring-violet-500 focus:border-violet-500 transition-colors"
                    disabled={isLoading}
                />
                <button
                    onClick={processWithAI}
                    disabled={isLoading || !statementText}
                    className="w-full mt-4 flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-lg transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                    {isLoading ? <SpinnerIcon className="w-6 h-6 animate-spin" /> : <SparklesIcon className="w-6 h-6" />}
                    <span>{isLoading ? 'Analizando...' : 'Analizar con IA'}</span>
                </button>
            </div>
            
            {stagedTransactions.length > 0 && !isLoading && (
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Revisa y Categoriza ({stagedTransactions.length} transacciones encontradas)</h3>
                    <div className="max-h-96 overflow-y-auto mb-4 border border-slate-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-800">
                                <tr className="border-b border-slate-600 text-gray-400">
                                    <th className="p-2 text-left">Fecha</th>
                                    <th className="p-2 text-left">Descripción</th>
                                    <th className="p-2 text-right">Monto</th>
                                    <th className="p-2 text-left">Categoría</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stagedTransactions.map(t => (
                                    <tr key={t.id} className={`border-b border-slate-700 ${!t.isValid ? 'bg-rose-900/50' : ''}`}>
                                        <td className="p-2">{t.date}</td>
                                        <td className="p-2">{t.description}</td>
                                        <td className={`p-2 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                        </td>
                                        <td className="p-2">
                                            {t.type === TransactionType.EXPENSE ? (
                                                <select
                                                    value={t.category}
                                                    onChange={(e) => updateStagedTransaction(t.id, 'category', e.target.value)}
                                                    className="w-full bg-slate-700 border-slate-600 rounded-md py-1 px-2 text-white text-xs"
                                                >
                                                    {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            ) : (
                                                <span className="text-gray-400">Ingreso</span>
                                            )}
                                        </td>
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
                    <h3 className="text-lg font-semibold text-rose-300 mb-2">Error en el Procesamiento</h3>
                    <p className="text-sm text-rose-200">No se pudieron procesar los datos. Esto puede deberse a un problema con la API o a que el texto del extracto no es claro. Por favor, inténtalo de nuevo.</p>
                </div>
            )}
        </div>
    );
};

export default AiImportView;
