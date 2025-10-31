import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Transaction, TransactionType, StagedTransaction, ProcessingError } from '../types';
import { UploadCloudIcon, FileIcon, SpinnerIcon, SparklesIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

declare var XLSX: any;
declare var pdfjsLib: any;

interface ImportProps {
  setActiveTab: (tab: 'dashboard' | 'importar' | 'base' | 'backup' | 'settings') => void;
}

const Import: React.FC<ImportProps> = ({ setActiveTab }) => {
  const { expenseCategories, allTransactions, handleConfirmImport, accounts } = useAppContext();

  const [ai, setAi] = useState<GoogleGenAI | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [files, setFiles] = useState<FileList | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
  const [processingErrors, setProcessingErrors] = useState<ProcessingError[]>([]);
  
  useEffect(() => {
    setTimeout(() => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        setInitError('La clave de API de Google AI no está configurada.');
      } else {
        try {
          const genAI = new GoogleGenAI({ apiKey });
          setAi(genAI);
        } catch (e) {
          console.error("Error initializing GoogleGenAI:", e);
          setInitError("Ocurrió un error al inicializar la API de IA. Revisa la consola para más detalles.");
        }
      }
    }, 100);
  }, []);

  const isReadyToAnalyze = useMemo(() => files && files.length > 0 && selectedAccountId !== '' && !!ai, [files, selectedAccountId, ai]);
  const isReviewing = useMemo(() => stagedTransactions.length > 0 || processingErrors.length > 0, [stagedTransactions, processingErrors]);

  const resetState = () => {
    setFiles(null);
    setSelectedAccountId('');
    setContext('');
    setIsLoading(false);
    setProgressMessage('');
    setStagedTransactions([]);
    setProcessingErrors([]);
  };

  const fileToText = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async (event) => {
                try {
                    const pdfData = new Uint8Array(event.target?.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
                    let textContent = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const text = await page.getTextContent();
                        textContent += text.items.map((s: any) => s.str).join(' ');
                    }
                    resolve(textContent);
                } catch (e) { reject('Error reading PDF file.'); }
            };
            reader.readAsArrayBuffer(file);
        });
    } else if (file.name.endsWith('.csv') || file.type === 'text/csv') {
        return file.text();
    } else if (file.name.endsWith('.xlsx') || file.type.includes('spreadsheetml')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet);
                    resolve(JSON.stringify(json));
                } catch (e) { reject('Error reading Excel file.') }
            };
            reader.readAsArrayBuffer(file);
        });
    } else {
        return file.text();
    }
  };

  const handleAnalyze = async () => {
    if (!isReadyToAnalyze || !ai) return;

    setIsLoading(true);
    let allProcessed: StagedTransaction[] = [];
    let allErrors: ProcessingError[] = [];
    const sourceName = accounts.find(acc => acc.id === selectedAccountId)?.accountName || 'Desconocida';

    for (let i = 0; i < files!.length; i++) {
        const file = files![i];
        setProgressMessage(`Analizando archivo ${i + 1}/${files!.length}: ${file.name}...`);
        try {
            const fileContent = await fileToText(file);
            
            const prompt = `You are an expert financial data processor. Your task is to analyze raw transaction data from various file formats, clean it, structure it, and categorize it.
            
            **Instructions:**
            1.  **Parse the raw_data**. Identify columns for date, description, and amount, even with different names (e.g., 'Fecha', 'Concepto', 'Importe', 'Valor').
            2.  **Normalize the data**: Convert dates to 'YYYY-MM-DD' format. Convert amounts to a standard number (e.g., '1.250,99' becomes 1250.99). Negative amounts are 'EXPENSE', positive are 'INCOME'.
            3.  **Categorize each transaction** based on its description using the provided 'user_categories' list.
            4.  **Prioritize historical matching**: If a transaction's description is very similar to one in 'historical_transactions', use its category.
            5.  **Use AI for new items**: For new descriptions, choose the most logical category from 'user_categories'. If uncertain, use 'Sin Categorizar'.
            6.  **Validate each entry**: Date and amount are mandatory. If a row is invalid or cannot be processed, add it to the 'errors' array with a clear 'reason'.
            7.  **Respond with a single JSON object** containing 'processedTransactions' and 'errors'.
            
            **User Categories**: ${JSON.stringify(expenseCategories)}
            **Historical Transactions (for context)**: ${JSON.stringify(allTransactions.slice(0, 20).map(t => ({description: t.description, category: t.category})))}
            **Raw Data**:
            \`\`\`
            ${fileContent}
            \`\`\`
            `;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    processedTransactions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING, description: 'YYYY-MM-DD format' },
                                description: { type: Type.STRING },
                                amount: { type: Type.NUMBER },
                                type: { type: Type.STRING, enum: ['INCOME', 'EXPENSE'] },
                                category: { type: Type.STRING }
                            }
                        }
                    },
                    errors: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                rawData: { type: Type.STRING },
                                reason: { type: Type.STRING }
                            }
                        }
                    }
                }
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: responseSchema,
                },
            });

            const result = JSON.parse(response.text);
            
            if (result.processedTransactions) {
                const newProcessed = result.processedTransactions.map((t: any) => ({
                    ...t,
                    id: crypto.randomUUID(),
                    isValid: true,
                    amount: Math.abs(t.amount),
                    source: sourceName,
                }));
                allProcessed = [...allProcessed, ...newProcessed];
            }
            if (result.errors) {
                allErrors = [...allErrors, ...result.errors];
            }

        } catch (error) {
            console.error('Error processing file:', error);
            allErrors.push({ rawData: file.name, reason: 'Error general de procesamiento. Verifique el formato del archivo o la consola para más detalles.' });
        }
    }
    setStagedTransactions(allProcessed);
    setProcessingErrors(allErrors);
    setProgressMessage('Análisis completado. Revise las transacciones a continuación.');
    setIsLoading(false);
  };
  
  const handleCategoryChange = (id: string, newCategory: string) => {
    setStagedTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
  };
  
  const handleConfirm = () => {
    const finalTransactions: Transaction[] = stagedTransactions
        .filter(t => t.isValid)
        .map(t => ({
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

  if (initError) {
    return (
        <div className="bg-rose-900/50 border border-rose-700 p-6 rounded-xl text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-rose-300 mb-2">Error de Configuración</h2>
            <p className="text-rose-200">
                {initError} Por favor, asegúrate de que la variable de entorno 
                <code className="bg-slate-700 text-white px-2 py-1 rounded-md mx-1 font-mono">API_KEY</code> 
                esté definida en la configuración de tu proyecto en Vercel.
            </p>
        </div>
    );
  }

  if (!ai) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800 rounded-xl">
            <SpinnerIcon className="w-16 h-16 text-violet-400 animate-spin mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Inicializando Módulo de IA...</h2>
        </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 bg-slate-800 rounded-xl">
        <SpinnerIcon className="w-16 h-16 text-violet-400 animate-spin mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Procesando Archivos...</h2>
        <p className="text-gray-400">{progressMessage}</p>
      </div>
    );
  }

  if (isReviewing) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Revisar y Confirmar Transacciones</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-slate-600 text-sm text-gray-400">
                        <tr>
                            <th className="p-3">Fecha</th><th className="p-3">Descripción</th><th className="p-3">Monto</th><th className="p-3">Tipo</th><th className="p-3">Categoría Sugerida</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stagedTransactions.map(t => (
                            <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                <td className="p-3 whitespace-nowrap">{t.date}</td>
                                <td className="p-3">{t.description}</td>
                                <td className={`p-3 font-mono ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === 'INCOME' ? '+' : '-'}€{t.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</td>
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
        
        {processingErrors.length > 0 && (
             <div className="bg-rose-900/50 border border-rose-700 p-4 rounded-xl">
                 <h3 className="text-xl font-semibold text-rose-300 mb-2">Errores de Procesamiento</h3>
                 <ul className="list-disc list-inside text-rose-300 text-sm space-y-1">
                     {processingErrors.map((e, i) => <li key={i}><strong>{e.reason}:</strong> <span className="font-mono bg-slate-700 px-1 rounded">{e.rawData}</span></li>)}
                 </ul>
             </div>
        )}
        
        <div className="flex justify-end space-x-4">
            <button onClick={resetState} className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Cancelar</button>
            <button onClick={handleConfirm} className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">Confirmar e Importar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
        <div className="text-center mb-6">
            <SparklesIcon className="w-10 h-10 text-violet-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold">Importación Inteligente de Datos</h2>
            <p className="text-gray-400 mt-1">Sube tus extractos bancarios (CSV, XLSX, PDF) y deja que la IA los organice.</p>
        </div>

        <div className="space-y-4">
            <div>
                <label htmlFor="account" className="block text-sm font-medium text-gray-300 mb-1">Cuenta (Obligatorio)</label>
                <select id="account" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500">
                    <option value="" disabled>Selecciona una cuenta</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.bankName})</option>
                    ))}
                </select>
                {accounts.length === 0 && <p className="text-xs text-yellow-400 mt-1">No has añadido ninguna cuenta. Ve a Configuración para empezar.</p>}
            </div>
            <div>
                <label htmlFor="context" className="block text-sm font-medium text-gray-300 mb-1">Contexto Adicional (Opcional)</label>
                <textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} rows={2} placeholder="Ej: Extracto de la tarjeta de mayo 2024" className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:ring-violet-500 focus:border-violet-500"></textarea>
            </div>
            <div>
                 <label className="block text-sm font-medium text-gray-300 mb-1">Archivos</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400"/>
                        <div className="flex text-sm text-gray-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-violet-400 hover:text-violet-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-violet-500">
                                <span>Seleccionar Archivos</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={(e) => setFiles(e.target.files)} accept=".csv, .xlsx, .pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf"/>
                            </label>
                        </div>
                        <p className="text-xs text-gray-500">CSV, XLSX, PDF</p>
                    </div>
                </div>
                {files && files.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {Array.from(files).map((file: File) => (
                            <div key={file.name} className="flex items-center text-sm bg-slate-700 p-2 rounded-md">
                                <FileIcon className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                                <span className="truncate">{file.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={handleAnalyze}
                disabled={!isReadyToAnalyze || isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
                >
                <SparklesIcon className="w-5 h-5"/>
                <span>Analizar Archivo</span>
            </button>
        </div>
    </div>
  );
};

export default Import;